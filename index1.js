require("dotenv").config();

const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const QRCode = require("qrcode");
const { createClient } = require("@supabase/supabase-js");

const BOT_IMAGE = "https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png";
const DEV_WHATSAPP = "255780470905";
const DEV_GITHUB = "xbotmanager-cell";
const START_TIME = Date.now();

// ================= GLOBAL SETUP =================
global.prefix = ".";
global.tenantId = process.env.TENANT_ID || process.env.CLIENT_ID || "vex_default";
global.clientId = global.tenantId;

// ================= SUPABASE =================
const SUPA_URL = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.MASTER_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!SUPA_URL ||!SUPA_KEY) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(SUPA_URL, SUPA_KEY);

// Load config from vex_config (no restart needed)
async function loadVexConfig() {
    try {
        const { data } = await supabase.from("vex_config").select("key,value");
        data?.forEach(i => { if (i.key && i.value) process.env[i.key] = i.value; });
        global.prefix = process.env.PREFIX || process.env.prefix || ".";
    } catch (e) {}
}
setInterval(loadVexConfig, 30000);
loadVexConfig();

// Set tenant - FIXED: use async/await properly
(async () => {
    try {
        await supabase.rpc("set_tenant", { tenant_name: global.tenantId });
    } catch (e) {
        // Silent fail, continue
    }
})();

// Wrap supabase for auto tenant_id
const origFrom = supabase.from.bind(supabase);
supabase.from = (table) => {
    const q = origFrom(table);
    if (table === "vex_config") return q;
    const t = global.tenantId;
    const wrap = (fn, inject) => (...a) => { const r = fn(...a); return inject? r.eq("tenant_id", t) : r; };
    ["select", "update", "delete"].forEach(m => { q[m] = wrap(q[m].bind(q), true); });
    const ins = q.insert.bind(q);
    q.insert = d => ins(Array.isArray(d)? d.map(x => ({...x, tenant_id: t })) : {...d, tenant_id: t });
    const up = q.upsert.bind(q);
    q.upsert = (d, o) => up(Array.isArray(d)? d.map(x => ({...x, tenant_id: t })) : {...d, tenant_id: t }, o);
    return q;
};
global.supabase = supabase;

// ================= SESSION CLOUD =================
async function syncSessionToCloud(creds) {
    try {
        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
        await supabase.from("vex_session").upsert({
            id: 'v1_session',
            data: base64,
            tenant_id: global.tenantId
        });
    } catch (e) {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await supabase
           .from("vex_session")
           .select("data")
           .eq("id", 'v1_session')
           .single();
        if (data?.data) {
            const decoded = Buffer.from(data.data, "base64").toString("utf-8");
            if (!fs.existsSync("./session")) fs.mkdirSync("./session", { recursive: true });
            fs.writeFileSync("./session/creds.json", decoded);
            console.log(`Session restored for ${global.tenantId}`);
        }
    } catch (e) {}
}

// ================= CORE =================
const router = require("./core/router");
const cache = require("./core/cache");
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");
const commands = new Map();
const aliases = new Map();
const observers = [];

function loadCommands() {
    commands.clear();
    aliases.clear();
    if (!fs.existsSync(pluginPath)) return;
    fs.readdirSync(pluginPath).filter(f => f.endsWith(".js")).forEach(f => {
        try {
            delete require.cache[require.resolve(path.join(pluginPath, f))];
            const p = require(path.join(pluginPath, f));
            const n = p.command || f.replace(".js", "");
            commands.set(n, p);
            p.alias?.forEach(a => aliases.set(a, n));
        } catch (e) {}
    });
    console.log(`Commands loaded: ${commands.size}`);
}

function loadObservers() {
    observers.length = 0;
    if (!fs.existsSync(observerPath)) return;
    fs.readdirSync(observerPath).filter(f => f.endsWith(".js")).forEach(f => {
        try {
            delete require.cache[require.resolve(path.join(observerPath, f))];
            const o = require(path.join(observerPath, f));
            if (o.onMessage) observers.push(o);
        } catch (e) {}
    });
    console.log(`Observers loaded: ${observers.length}`);
}

loadCommands();
loadObservers();
try { fs.watch(pluginPath, () => loadCommands()); } catch {}
try { fs.watch(observerPath, () => loadObservers()); } catch {}

// ================= SERVER & UI =================
const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 10000;
const DEPLOY_KEY = process.env.DEPLOY_KEY || "vex2026";

app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    if (req.query.k!== DEPLOY_KEY && req.path!== "/blocked") return res.redirect("/blocked");
    next();
});

app.get("/blocked", (req, res) => res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access Denied</title><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0215 url('${BOT_IMAGE}') center/cover no-repeat;font-family:Outfit,sans-serif;padding:20px}body::before{content:'';position:fixed;inset:0;background:rgba(11,2,21,0.85);backdrop-filter:blur(12px)}.card{position:relative;max-width:520px;width:100%;padding:40px 32px;border-radius:28px;background:rgba(255,255,255,0.06);border:1px solid rgba(168,85,247,0.3);box-shadow:0 0 60px rgba(168,85,247,0.35);text-align:center;color:#fff}h1{font-size:2.4rem;font-weight:800;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}p{color:#d8b4fe;line-height:1.6;margin:12px 0;font-size:1.05rem}.btn{display:inline-block;margin-top:24px;padding:14px 28px;border-radius:16px;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;text-decoration:none;font-weight:600}</style></head><body><div class="card"><h1>Access Denied</h1><p>This hosting link is private and reserved for verified customers only.</p><p>Purchase your VEX BOT to receive your secure access key.</p><a class="btn" href="https://wa.me/${DEV_WHATSAPP}">Contact Developer</a></div></body></html>`));

app.get("/", (req, res) => res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>VEX HOST - ${global.tenantId}</title><script src="/socket.io/socket.io.js"></script><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#05010e;color:#fff;font-family:Outfit,sans-serif;display:flex;flex-direction:column}body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 20%,#6d28d9 0%,transparent 40%),radial-gradient(circle at 80% 80%,#db2777 0%,transparent 40%),#05010e;z-index:-1}.wrap{max-width:1100px;margin:0 auto;padding:24px;width:100%}.header{display:flex;align-items:center;gap:16px;margin-bottom:24px}.logo{width:64px;height:64px;border-radius:20px;overflow:hidden;box-shadow:0 0 30px rgba(168,85,247,0.5)}.logo img{width:100%;height:100%;object-fit:cover}h1{font-size:1.8rem;font-weight:800;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:860px){.grid{grid-template-columns:1fr}}.card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);border:1px solid rgba(168,85,247,0.25);border-radius:24px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,0.3)}.status{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:16px;background:rgba(0,0,0,0.3);border:1px solid rgba(168,85,247,0.3);font-weight:600;margin:16px 0}.dot{width:10px;height:10px;border-radius:50%;background:#f59e0b;box-shadow:0 0 10px #f59e0b;animation:pulse 2s infinite}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}.qr-box{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;border-radius:20px;background:rgba(0,0,0,0.25);min-height:320px;justify-content:center}.qr-box img{width:260px;height:260px;border-radius:16px;background:#fff;padding:12px;box-shadow:0 0 30px rgba(168,85,247,0.4);display:none}.tabs{display:flex;gap:8px;margin-bottom:16px}.tab{flex:1;padding:12px;text-align:center;border-radius:12px;background:rgba(255,255,255,0.06);cursor:pointer;font-weight:600;transition:.2s}.tab.active{background:linear-gradient(90deg,#a855f7,#ec4899)}input{width:100%;padding:16px;border-radius:14px;border:1px solid rgba(168,85,247,0.3);background:rgba(0,0,0,0.4);color:#fff;font-size:1rem;outline:none;margin-bottom:12px}input:focus{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,0.2)}.btn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;font-weight:700;font-size:1rem;cursor:pointer;transition:.2s}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(168,85,247,0.4)}.error{color:#f87171;font-size:.9rem;margin-top:8px;min-height:20px;text-align:center}.code{font-size:2rem;font-weight:800;letter-spacing:4px;color:#a855f7;text-align:center;margin-top:12px}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}.info{padding:14px;border-radius:14px;background:rgba(0,0,0,0.25);text-align:center}.info.v{font-size:1.4rem;font-weight:700;color:#a855f7}.actions{display:flex;gap:10px;margin-top:20px}.action{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:12px;text-decoration:none;color:#fff;font-weight:600;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1)}.action.wa{background:#25D366}.action.gh{background:#24292e}.footer{margin-top:40px;padding:32px 0;border-top:1px solid rgba(255,255,255,0.08);color:#a1a1aa;line-height:1.7}.footer h3{color:#fff;margin-bottom:12px;font-size:1.2rem}</style></head><body><div class="wrap"><div class="header"><div class="logo"><img src="${BOT_IMAGE}"></div><div><h1>VEX HOST</h1><div style="color:#a1a1aa;font-size:.9rem">${global.tenantId}</div></div></div><div class="grid"><div class="card"><div class="status"><div class="dot" id="dot"></div><span id="statusText">Connecting to WhatsApp...</span></div><div class="tabs"><div class="tab active" onclick="switchTab(0)">QR Code</div><div class="tab" onclick="switchTab(1)">Pairing Code</div></div><div id="tab0"><div class="qr-box"><img id="qrImg"><div id="qrHint" style="color:#a1a1aa">Waiting for QR code...</div></div></div><div id="tab1" style="display:none"><input id="phone" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="Enter WhatsApp number e.g. 255780470905"><button class="btn" onclick="getCode()">Get Pairing Code</button><div class="error" id="err"></div><div class="code" id="pairCode"></div></div></div><div class="card"><h3 style="margin-bottom:12px">Bot Information</h3><div class="info-grid"><div class="info"><div class="v" id="cmdCount">0</div><div>Commands</div></div><div class="info"><div class="v" id="obsCount">0</div><div>Observers</div></div><div class="info"><div class="v" id="prefix">.</div><div>Prefix</div></div><div class="info"><div class="v" id="runtime">0m</div><div>Uptime</div></div></div><div class="actions"><a class="action wa" href="https://wa.me/${DEV_WHATSAPP}" target="_blank">WhatsApp</a><a class="action gh" href="https://github.com/${DEV_GITHUB}" target="_blank">GitHub</a></div></div></div><div class="footer"><h3>About VEX BOT by Lupin Starnley</h3><p>VEX is a high-performance WhatsApp automation platform built for speed, stability, and scale. Designed by developer Lupin Starnley, it runs on optimized VPS infrastructure with 99.9% uptime, advanced caching, and real-time command reloading without restarts. Every instance is isolated with secure tenant management, supporting unlimited plugins, AI integrations, and custom observers. Built for creators, businesses, and developers who demand reliability.</p><p style="margin-top:16px">Features include instant QR pairing, pairing code support, live configuration updates, multi-device support, and enterprise-grade session management. No downtime deployments ensure your bot stays online for months. Developed with precision engineering for maximum throughput and minimal resource usage.</p></div></div><script>const s=io();const qrImg=document.getElementById('qrImg'),qrHint=document.getElementById('qrHint'),statusText=document.getElementById('statusText'),dot=document.getElementById('dot');s.on('qr',d=>{qrImg.src=d;qrImg.style.display='block';qrHint.textContent='Scan this QR with WhatsApp';statusText.textContent='Scan QR Code';dot.style.background='#a855f7';dot.style.boxShadow='0 0 10px #a855f7'});s.on('pairing_code',c=>{document.getElementById('pairCode').textContent=c;statusText.textContent='Enter code in WhatsApp'});s.on('connected',d=>{qrImg.style.display='none';qrHint.textContent='Connected successfully';statusText.textContent='Bot Online';dot.style.background='#22c55e';dot.style.boxShadow='0 0 10px #22c55e';document.getElementById('cmdCount').textContent=d.commands;document.getElementById('obsCount').textContent=d.observers;document.getElementById('prefix').textContent=d.prefix});s.on('stats',d=>{document.getElementById('runtime').textContent=d.uptime});function switchTab(i){document.querySelectorAll('.tab').forEach((t,idx)=>t.classList.toggle('active',idx===i));document.getElementById('tab0').style.display=i===0?'block':'none';document.getElementById('tab1').style.display=i===1?'block':'none'}function getCode(){const p=document.getElementById('phone').value.replace(/[^0-9]/g,'');const err=document.getElementById('err');err.textContent='';if(!p){err.textContent='Please enter your WhatsApp number';return}if(p.length<10||p.length>15){err.textContent='Invalid number format. Use country code without +';return}s.emit('request_pair',p);document.getElementById('pairCode').textContent='Requesting...'}setInterval(()=>s.emit('get_stats'),5000)</script></body></html>`));

// ================= WHATSAPP BOT =================
let sock, saveCreds;

async function startBot() {
    await loadSessionFromCloud();

    const { state, saveCreds: sc } = await useMultiFileAuthState("session");
    saveCreds = sc;
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" }))
        },
        browser: ["VEX HOST", "Chrome", "120.0"]
    });
    global.sock = sock;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
            const data = await QRCode.toDataURL(qr);
            io.emit("qr", data);
        }
        if (connection === "close") {
            const code = lastDisconnect?.error?.output?.statusCode;
            if (code!== DisconnectReason.loggedOut) {
                setTimeout(startBot, 3000);
            }
        }
        if (connection === "open") {
            io.emit("connected", { commands: commands.size, observers: observers.length, prefix: global.prefix });
            await syncSessionToCloud(state.creds);

            const uptime = Math.floor((Date.now() - START_TIME) / 60000);
            const msg = `╭━━━━━━━━━━━━━━━━━╮
┃ ✅ VEX BOT PAIRED
╰━━━━━━━━━━━━━━━━━╯

• Status: Online
• Prefix: ${global.prefix}
• Commands: ${commands.size}
• Observers: ${observers.length}
• Uptime: ${uptime}m
• Tenant: ${global.tenantId}

Bot is ready. Type ${global.prefix}menu to begin.`;
            try {
                await sock.sendMessage(sock.user.id, { image: { url: BOT_IMAGE }, caption: msg });
            } catch (e) {}
        }
    });

    sock.ev.on("creds.update", async () => {
        await saveCreds();
        await syncSessionToCloud(sock.authState.creds);
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0];
        if (!m?.message) return;

        const body = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim();
        m.chat = m.key.remoteJid;
        m.sender = m.key.participant || m.chat;
        m.reply = t => sock.sendMessage(m.chat, { text: t }, { quoted: m });

        for (const o of observers) {
            try {
                if (!o.trigger || o.trigger(m)) await o.onMessage(m, sock, { supabase, cache, clientId: global.clientId, userSettings: cache.getUser?.(m.sender) || {} });
            } catch (e) {}
        }

        try {
            const route = await router(m, { body, commands, aliases, observers, cache, supabase, prefix: global.prefix, clientId: global.clientId });
            if (route?.type === "command") await route.command.execute(m, sock, route.context);
            else if (route?.type === "custom") await route.execute(sock);
        } catch (e) {}
    });
}

// Socket events
io.on("connection", socket => {
    socket.on("request_pair", async phone => {
        try {
            if (!sock) return socket.emit("pairing_code", "BOT NOT READY");
            let num = phone.replace(/[^0-9]/g, "");
            if (num.startsWith("0")) num = "255" + num.slice(1);
            if (num.startsWith("+")) num = num.slice(1);
            if (num.length < 10) return socket.emit("pairing_code", "INVALID");
            const code = await sock.requestPairingCode(num);
            socket.emit("pairing_code", code);
        } catch (e) {
            socket.emit("pairing_code", "ERROR");
        }
    });

    socket.on("get_stats", () => {
        const mins = Math.floor((Date.now() - START_TIME) / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        socket.emit("stats", { uptime: h? `${h}h ${m}m` : `${m}m` });
    });
});

server.listen(PORT, () => {
    console.log(`VEX running on ${PORT}`);
    startBot();
});

process.on("uncaughtException", (err) => console.error("Exception:", err.message));
process.on("unhandledRejection", (reason) => console.error("Rejection:", reason));
