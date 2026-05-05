// ========================================================
// VEX SYSTEM - MULTI-INSTANCE SAAS MANAGER (FIXED PRO)
// ========================================================

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const fs = require("fs");

// CORE
const VexInstance = require("./core/VexInstance");
const cache = require("./core/cache");
const router = require("./core/router");

// SERVER
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
const PORT = process.env.PORT || 10000;

// DB
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// MEMORY
const activeInstances = new Map();

// COMMANDS
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");
const commands = new Map();
const aliases = new Map();
const observers = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ================= LOAD =================
function loadResources() {
    commands.clear();
    aliases.clear();
    observers.length = 0;

    if (fs.existsSync(pluginPath)) {
        const files = fs.readdirSync(pluginPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
            try {
                const plugin = require(path.join(pluginPath, file));
                const name = plugin.command || file.replace(".js", "");
                commands.set(name, plugin);
                if (Array.isArray(plugin.alias)) {
                    plugin.alias.forEach(a => aliases.set(a, name));
                }
            } catch {}
        }
    }

    if (fs.existsSync(observerPath)) {
        const files = fs.readdirSync(observerPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
            try {
                const obs = require(path.join(observerPath, file));
                if (obs.onMessage) observers.push(obs);
            } catch {}
        }
    }

    console.log(`✅ Loaded: ${commands.size} cmds | ${observers.length} observers`);
}

// ================= BOOT INSTANCE =================
async function bootInstance(user) {
    if (activeInstances.has(user.M_user_id)) return;

    if (user.M_vx_balance < 20 && user.M_membership_tier !== "LIFETIME") {
        console.log("⛔ Not enough VX:", user.M_user_id);
        return;
    }

    const instance = new VexInstance(user, {
        commands,
        aliases,
        observers,
        router,
        cache,
        io
    });

    try {
        await instance.init();
        activeInstances.set(user.M_user_id, instance);
        console.log("✅ Instance started:", user.M_user_id);
    } catch (e) {
        console.log("❌ Boot error:", e.message);
    }
}

// ================= START ENGINE =================
async function startSaaS() {
    console.log("🚀 VEX ENGINE START...");

    await cache.init(supabase);
    loadResources();

    const { data: users } = await supabase
        .from("M_users")
        .select("*")
        .eq("M_account_status", "active");

    for (const user of users || []) {
        const { data: session } = await supabase
            .from("M_sessions")
            .select("*")
            .eq("M_user_id", user.M_user_id)
            .eq("M_pairing_status", "connected")
            .maybeSingle();

        if (session) {
            await bootInstance(user);
        }
    }

    // REALTIME
    supabase
        .channel("users-live")
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "M_users"
        }, async (payload) => {

            const user = payload.new;

            if (user.M_account_status === "active") {
                await bootInstance(user);
            } else {
                if (activeInstances.has(user.M_user_id)) {
                    const inst = activeInstances.get(user.M_user_id);
                    try { inst.sock.logout(); } catch {}
                    activeInstances.delete(user.M_user_id);
                    console.log("🛑 Instance stopped:", user.M_user_id);
                }
            }

        })
        .subscribe();
}

// ================= SOCKET =================
io.on("connection", (socket) => {

    socket.on("join", (userId) => {
        socket.join(userId);
        console.log("👤 Joined room:", userId);
    });

});

// ================= ROUTES =================

// HOME
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

// START PAIRING
app.get("/request-pair/:userId", async (req, res) => {
    const { userId } = req.params;

    const { data: user } = await supabase
        .from("M_users")
        .select("*")
        .eq("M_user_id", userId)
        .single();

    if (!user) return res.status(404).json({ error: "User not found" });

    // avoid duplicate
    if (activeInstances.has(userId)) {
        return res.json({ status: "already_running" });
    }

    const instance = new VexInstance(user, {
        commands,
        aliases,
        observers,
        router,
        cache,
        io
    });

    try {
        await instance.initPairing(); // ONLY QR MODE
        activeInstances.set(userId, instance);

        res.json({ status: "pairing_started" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// STOP
app.post("/stop", async (req, res) => {
    const { userId } = req.body;

    if (activeInstances.has(userId)) {
        const inst = activeInstances.get(userId);
        try { inst.sock.logout(); } catch {}
        activeInstances.delete(userId);
    }

    res.json({ status: "stopped" });
});

// STATIC PAGES
app.get("/:page", (req, res) => {
    const file = path.join(__dirname, "public", req.params.page);
    if (fs.existsSync(file)) return res.sendFile(file);
    res.status(404).send("Not Found");
});

// START
server.listen(PORT, () => {
    startSaaS();
    console.log("🌐 Server running on:", PORT);
});

// ERRORS
process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});
