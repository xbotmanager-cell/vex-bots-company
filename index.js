// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS MANAGER (PRO)
// Author: Lupin Starnley Jimmoh
// Purpose: Orchestrates instances with SQL session sync
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

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function loadResources() {
    if (fs.existsSync(pluginPath)) {
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
    }

    if (fs.existsSync(observerPath)) {
        const obsFiles = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));
        for (const file of obsFiles) {
            try {
                const obs = require(path.join(observerPath, file));
                if (obs.onMessage) observers.push(obs);
            } catch (e) { console.error(`Failed to load observer ${file}`); }
        }
    }
    console.log(`✅ System Resources Loaded: ${commands.size} Commands | ${observers.length} Observers`);
}

/**
 * START A SPECIFIC BOT INSTANCE
 */
async function bootInstance(userData) {
    if (activeInstances.has(userData.M_user_id)) return;

    // Check balance from M_users (SQL Logic)
    if (userData.M_vx_balance < 20 && userData.M_membership_tier !== 'LIFETIME') {
        console.log(`[MANAGER] Low Balance for: ${userData.M_user_id}`);
        return;
    }

    const coreComponents = { commands, aliases, observers, router, cache, io };
    const instance = new VexInstance(userData, coreComponents);
    
    try {
        await instance.init();
        activeInstances.set(userData.M_user_id, instance);
    } catch (e) {
        console.error(`[MANAGER] Boot Failed for ${userData.M_user_id}:`, e.message);
    }
}

/**
 * INITIALIZE SAAS ENGINE
 */
async function startSaaS() {
    console.log("🚀 VEX SAAS ENGINE STARTING...");
    
    await cache.init(supabase);
    loadResources();

    // GET ACTIVE USERS (M_account_status)
    const { data: subscribers, error } = await supabase
        .from("M_users")
        .select("*")
        .eq("M_account_status", "active");

    if (error) {
        console.error("[MANAGER] DB Fetch Error:", error.message);
        return;
    }

    for (const user of subscribers) {
        // Only boot if they have a 'connected' session in M_sessions
        const { data: session } = await supabase
            .from("M_sessions")
            .select("M_pairing_status")
            .eq("M_user_id", user.M_user_id)
            .eq("M_pairing_status", "connected")
            .single();

        if (session) await bootInstance(user);
    }

    // REAL-TIME POSTGRES SYNC
    supabase
        .channel("system-monitor")
        .on("postgres_changes", { event: "*", schema: "public", table: "M_users" }, async (payload) => {
            const user = payload.new;
            
            // Handle Activation/Deactivation
            if (user.M_account_status === "active" && !activeInstances.has(user.M_user_id)) {
                await bootInstance(user);
            } else if (user.M_account_status !== "active" && activeInstances.has(user.M_user_id)) {
                const instance = activeInstances.get(user.M_user_id);
                if (instance.sock) instance.sock.logout();
                activeInstances.delete(user.M_user_id);
            }
        })
        .subscribe();
}

// WEB INTERFACE ROUTING
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html")); 
});

// ROUTE FOR INTERNAL PAIRING HANDLED BY VEXINSTANCE
app.get("/request-pair/:userId", async (req, res) => {
    const { userId } = req.params;
    
    // Check if user exists in M_users
    const { data: user } = await supabase.from("M_users").select("*").eq("M_user_id", userId).single();
    
    if (user) {
        // Internal VexInstance will handle the UI stream via Socket
        if (!activeInstances.has(userId)) {
            const tempInstance = new VexInstance(user, { commands, aliases, observers, router, cache, io });
            await tempInstance.initPairing(); 
            activeInstances.set(userId, tempInstance);
        }
        res.status(200).json({ status: "Pairing Initialized" });
    } else {
        res.status(404).send("User Not Found");
    }
});

app.get("/:page", (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, "public", page.endsWith(".html") ? page : `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send("Resource Not Found");
    }
});

// START SERVER
server.listen(PORT, () => {
    startSaaS();
    console.log(`📡 VEX Manager active on port: ${PORT}`);
});

// GLOBAL ERROR RECOVERY
process.on("uncaughtException", (err) => console.error("KERNEL CRITICAL:", err));
process.on("unhandledRejection", (err) => console.error("PROMISE CRITICAL:", err));
