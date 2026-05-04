// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS MANAGER (FIXED)
// Author: Lupin Starnley Jimmoh
// Purpose: Orchestrates multiple bot instances from Supabase
// ========================================================

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

// CORE COMPONENTS
const VexInstance = require("./core/VexInstance");
const cache = require("./core/cache");
const router = require("./core/router");

// SETUP
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;

// DATABASE
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// STORE ACTIVE INSTANCES (Memory Map)
const activeInstances = new Map();

// LOAD COMMANDS & OBSERVERS
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");
const commands = new Map();
const aliases = new Map();
const observers = [];

// [FIX] ALLOW ALL STATIC FILES FROM PUBLIC FOLDER
app.use(express.static(path.join(__dirname, "public")));

function loadResources() {
    const cmdFiles = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));
    for (const file of cmdFiles) {
        try {
            const plugin = require(path.join(pluginPath, file));
            const name = plugin.command || file.replace(".js", "");
            commands.set(name, plugin);
            if (Array.isArray(plugin.alias)) {
                plugin.alias.forEach(a => aliases.set(a, name));
            }
        } catch (e) { console.error(`Failed to load command ${file}`); }
    }

    const obsFiles = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));
    for (const file of obsFiles) {
        try {
            const obs = require(path.join(observerPath, file));
            if (obs.onMessage) observers.push(obs);
        } catch (e) { console.error(`Failed to load observer ${file}`); }
    }
    console.log(`✅ System Resources Loaded: ${commands.size} Commands | ${observers.length} Observers`);
}

/**
 * START A SPECIFIC BOT INSTANCE
 */
async function bootInstance(userData) {
    if (activeInstances.has(userData.M_user_id)) return;

    const coreComponents = { commands, aliases, observers, router, cache };
    const instance = new VexInstance(userData, coreComponents);
    
    try {
        await instance.init();
        activeInstances.set(userData.M_user_id, instance);
    } catch (e) {
        console.error(`[MANAGER] Failed to boot instance for ${userData.M_user_id}:`, e.message);
    }
}

/**
 * INITIALIZE SAAS ENGINE
 */
async function startSaaS() {
    console.log("🚀 VEX SAAS ENGINE STARTING...");
    
    await cache.init(supabase);
    loadResources();

    // [FIX] ALIGNED TO SQL SCHEMA (M_account_status)
    const { data: subscribers, error } = await supabase
        .from("M_users")
        .select("*")
        .eq("M_account_status", "active");

    if (error) {
        console.error("[MANAGER] DB Fetch Error:", error.message);
        return;
    }

    for (const user of subscribers) {
        await bootInstance(user);
    }

    // REAL-TIME LISTENER
    supabase
        .channel("new-subscriptions")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "M_users" }, async (payload) => {
            // [FIX] ALIGNED TO SQL SCHEMA (M_account_status)
            if (payload.new.M_account_status === "active") {
                console.log(`[MANAGER] New Active User Detected: ${payload.new.M_user_id}`);
                await bootInstance(payload.new);
            }
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "M_users" }, async (payload) => {
            // [FIX] ALIGNED TO SQL SCHEMA (M_account_status)
            if (payload.new.M_account_status !== "active" && activeInstances.has(payload.new.M_user_id)) {
                console.log(`[MANAGER] Stopping Instance (Inactive/Expired): ${payload.new.M_user_id}`);
                const instance = activeInstances.get(payload.new.M_user_id);
                if (instance.sock) instance.sock.logout();
                activeInstances.delete(payload.new.M_user_id);
            }
        })
        .subscribe();
}

// WEB INTERFACE (For Scanning & Monitoring)
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html")); 
});

// [FIX] ROUTE FOR HOME.HTML OR OTHER PAGES IN PUBLIC
app.get("/:page", (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, "public", page);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("Page not found");
    }
});

// START SERVER
server.listen(PORT, () => {
    startSaaS();
    console.log(`📡 Manager running on port: ${PORT}`);
});

// SILENT GLOBAL ERRORS
process.on("uncaughtException", (err) => console.error("CRITICAL ERROR:", err));
process.on("unhandledRejection", (err) => console.error("UNHANDLED REJECTION:", err));
