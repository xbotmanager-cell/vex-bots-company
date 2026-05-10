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
global.tenantId = process.env.TENANT_ID || process.env.CLIENT_ID || "vex_default";
global.clientId = global.tenantId; // plugins expect clientId
global.prefix = ".";

// ================= SUPABASE =================
const SUPA_URL = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPA_KEY = process.env.MASTER_SUPABASE_KEY || process.env.SUPABASE_KEY;
if (!SUPA_URL ||!SUPA_KEY) { console.error("Missing Supabase"); process.exit(1); }
const supabase = createClient(SUPA_URL, SUPA_KEY);

// Load vex_config
async function loadVexConfig() {
    try {
        const { data } = await supabase.from("vex_config").select("key,value");
        data?.forEach(i => { if (i.key) process.env[i.key] = i.value; });
    } catch {}
}
loadVexConfig();
setInterval(loadVexConfig, 30000);

// Set tenant context
(async () => { try { await supabase.rpc("set_tenant", { tenant_name: global.tenantId }); } catch {} })();

// IMPORTANT: Keep client_id for plugins, DO NOT force tenant_id
// Wrapper only adds client_id automatically if missing
const origFrom = supabase.from.bind(supabase);
supabase.from = (table) => {
    const q = origFrom(table);
    if (table === "vex_config") return q;

    const originalSelect = q.select.bind(q);
    q.select = (...args) => originalSelect(...args).eq("client_id", global.clientId);

    const originalUpdate = q.update.bind(q);
    q.update = (data) => originalUpdate(data).eq("client_id", global.clientId);

    const originalDelete = q.delete.bind(q);
    q.delete = () => originalDelete().eq("client_id", global.clientId);

    const originalInsert = q.insert.bind(q);
    q.insert = (data) => {
        const inject = (d) => ({...d, client_id: global.clientId });
        return originalInsert(Array.isArray(data)? data.map(inject) : inject(data));
    };

    const originalUpsert = q.upsert.bind(q);
    q.upsert = (data, opts) => {
        const inject = (d) => ({...d, client_id: global.clientId });
        return originalUpsert(Array.isArray(data)? data.map(inject) : inject(data), opts);
    };

    return q;
};
global.supabase = supabase;

// ================= SESSION CLOUD - PER TENANT =================
async function syncSessionToCloud(creds) {
    try {
        const base64 = Buffer.from(JSON.stringify(creds)).toString("base64");
        await origFrom("vex_session").upsert({
            id: global.tenantId, // UNIQUE PER TENANT
            data: base64,
            client_id: global.clientId
        });
    } catch {}
}

async function loadSessionFromCloud() {
    try {
        const { data } = await origFrom("vex_session").select("data").eq("id", global.tenantId).single();
        if (data?.data) {
            const decoded = Buffer.from(data.data, "base64").toString();
            if (!fs.existsSync("./session")) fs.mkdirSync("./session", { recursive: true });
            fs.writeFileSync("./session/creds.json", decoded);
            console.log(`Session restored for ${global.tenantId}`);
        }
    } catch {}
}

// ================= PREFIX SYNC =================
async function syncPrefix() {
    try {
        const { data } = await supabase.from("vex_settings").select("extra_data").eq("setting_name", "prefix").single();
        if (data?.extra_data?.current) global.prefix = data.extra_data.current;
    } catch {}
}
syncPrefix();
setInterval(syncPrefix, 15000);

// ================= CORE =================
const router = require("./core/router");
const cache = require("./core/cache");
const pluginPath = path.join(__dirname, "plugins");
const observerPath = path.join(__dirname, "observers");
const commands = new Map(); const aliases = new Map(); const observers = [];

function loadCommands() {
    commands.clear(); aliases.clear();
    if (!fs.existsSync(pluginPath)) return;
    fs.readdirSync(pluginPath).filter(f => f.endsWith(".js")).forEach(f => {
        try { delete require.cache[require.resolve(path.join(pluginPath, f))];
            const p = require(path.join(pluginPath, f)); const n = p.command || f.replace(".js", "");
            commands.set(n, p); p.alias?.forEach(a => aliases.set(a, n));
        } catch {}
    });
}
function loadObservers() {
    observers.length = 0;
    if (!fs.existsSync(observerPath)) return;
    fs.readdirSync(observerPath).filter(f => f.endsWith(".js")).forEach(f => {
        try { delete require.cache[require.resolve(path.join(observerPath, f))];
            const o = require(path.join(observerPath, f)); if (o.onMessage) observers.push(o);
        } catch {}
    });
}
loadCommands(); loadObservers();
try { fs.watch(pluginPath, loadCommands); } catch {}
try { fs.watch(observerPath, loadObservers); } catch {}

// ================= SERVER =================
const app = express(); const server = http.createServer(app); const io = new Server(server);
const PORT = process.env.PORT || 10000; const DEPLOY_KEY = process.env.DEPLOY_KEY || "vex2026";

app.use((req, res, next) => {
    if (req.path.startsWith("/socket.io")) return next();
    if (req.query.k!== DEPLOY_KEY && req.path!== "/blocked") return res.redirect("/blocked");
    next();
});

app.get("/blocked", (req, res) => res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Access Denied</title><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0215 url('${BOT_IMAGE}') center/cover;font-family:Outfit,sans-serif}body::before{content:'';position:fixed;inset:0;background:rgba(11,2,21,.85);backdrop-filter:blur(12px)}.card{position:relative;max-width:520px;padding:40px 32px;border-radius:28px;background:rgba(255,255,255,.06);border:1px solid rgba(168,85,247,.3);box-shadow:0 0 60px rgba(168,85,247,.35);text-align:center;color:#fff}h1{font-size:2.4rem;font-weight:800;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:16px}.btn{display:inline-block;margin-top:24px;padding:14px 28px;border-radius:16px;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;text-decoration:none;font-weight:600}</style></head><body><div class="card"><h1>Access Denied</h1><p>This link is private.</p><a class="btn" href="https://wa.me/${DEV_WHATSAPP}">Contact Developer</a></div></body></html>`));

app.get("/", (req, res) => res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>VEX - ${global.tenantId}</title><script src="/socket.io/socket.io.js"></script><style>@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;800&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{min-height:100vh;background:#05010e;color:#fff;font-family:Outfit,sans-serif}body::before{content:'';position:fixed;inset:0;background:radial-gradient(circle at 20% 20%,#6d28d9 0,transparent 40%),radial-gradient(circle at 80% 80%,#db2777 0,transparent 40%),#05010e;z-index:-1}.wrap{max-width:1100px;margin:0 auto;padding:24px}.header{display:flex;align-items:center;gap:16px;margin-bottom:24px}.logo{width:64px;height:64px;border-radius:20px;overflow:hidden;box-shadow:0 0 30px rgba(168,85,247,.5)}.logo img{width:100%;height:100%;object-fit:cover}h1{font-size:1.8rem;font-weight:800;background:linear-gradient(90deg,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:860px){.grid{grid-template-columns:1fr}}.card{background:rgba(255,255,255,.05);backdrop-filter:blur(20px);border:1px solid rgba(168,85,247,.25);border-radius:24px;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.3)}.status{display:flex;align-items:center;gap:10px;padding:14px 18px;border-radius:16px;background:rgba(0,0,0,.3);border:1px solid rgba(168,85,247,.3);font-weight:600;margin:16px 0}.dot{width:10px;height:10px;border-radius:50%;background:#f59e0b;box-shadow:0 0 10px #f59e0b;animation:p 2s infinite}@keyframes p{0%,100%{opacity:1}50%{opacity:.4}}.qr-box{display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;border-radius:20px;background:rgba(0,0,0,.25);min-height:320px;justify-content:center}.qr-box img{width:260px;height:260px;border-radius:16px;background:#fff;padding:12px;box-shadow:0 0 30px rgba(168,85,247,.4);display:none}.tabs{display:flex;gap:8px;margin-bottom:16px}.tab{flex:1;padding:12px;text-align:center;border-radius:12px;background:rgba(255,255,255,.06);cursor:pointer;font-weight:600}.tab.active{background:linear-gradient(90deg,#a855f7,#ec4899)}input{width:100%;padding:16px;border-radius:14px;border:1px solid rgba(168,85,247,.3);background:rgba(0,0,0,.4);color:#fff;font-size:1rem;outline:none;margin-bottom:12px}.btn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(90deg,#a855f7,#ec4899);color:#fff;font-weight:700;font-size:1rem;cursor:pointer}.error{color:#f87171;font-size:.9rem;margin-top:8px;min-height:20px;text-align:center}.code{font-size:2rem;font-weight:800;letter-spacing:4px;color:#a855f7;text-align:center;margin-top:12px}.info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:16px}.info{padding:14px;border-radius:14px;background:rgba(0,0,0,.25);text-align:center}.info.v{font-size:1.4rem;font-weight:700;color:#a855f7}.actions{display:flex;gap:10px;margin-top:20px}.action{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border-radius:12px;text-decoration:none;color:#fff;font-weight:600;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1)}.action.wa{background:#25D366}.action.gh{background:#24292e}</style></head><body><div class="wrap"><div class="header"><div class="logo"><img src="${BOT_IMAGE}"></div><div><h1>VEX HOST</h1><div style="color:#a1a1aa;font-size:.9rem">${global.tenantId}</div></div></div><div class="grid"><div class="card"><div class="status"><div class="dot" id="dot"></div><span id="statusText">Connecting...</span></div><div class="tabs"><div class="tab active" onclick="switchTab(0)">QR Code</div><div class="tab" onclick="switchTab(1)">Pairing Code</div></div><div id="tab0"><div class="qr-box"><img id="qrImg"><div id="qrHint" style="color:#a1a1aa">Waiting for QR...</div></div></div><div id="tab1" style="display:none"><input id="phone" type="tel" inputmode="numeric" placeholder="255780470905"><button class="btn" onclick="getCode()">Get Pairing Code</button><div class="error" id="err"></div><div class="code" id="pairCode"></div></div></div><div class="card"><h3>Bot Information</h3><div class="info-grid"><div class="info"><div class="v" id="cmdCount">0</div><div>Commands</div></div><div class="info"><div class="v" id="obsCount">0</div><div>Observers</div></div><div class="info"><div class="v" id="prefix">.</div><div>Prefix</div></div><div class="info"><div class="v" id="runtime">0m</div><div>Uptime</div></div></div><div class="actions"><a class="action wa" href="https://wa.me/${DEV_WHATSAPP}" target="_blank">WhatsApp</a><a class="action gh" href="https://github.com/${DEV_GITHUB}" target="_blank">GitHub</a></div></div><script>const s=io();const qrImg=document.getElementById('qrImg'),qrHint=document.getElementById('qrHint'),statusText=document.getElementById('statusText'),dot=document.getElementById('dot');s.on('qr',d=>{qrImg.src=d;qrImg.style.display='block';qrHint.textContent='Scan with WhatsApp';statusText.textContent='Scan QR Code';dot.style.background='#a855f7'});s.on('pairing_code',c=>{document.getElementById('pairCode').textContent=c});s.on('connected',d=>{qrImg.style.display='none';qrHint.textContent='Connected';statusText.textContent='Bot Online';dot.style.background='#22c55e';updateInfo(d)});s.on('info',d=>updateInfo(d));s.on('stats',d=>document.getElementById('runtime').textContent=d.uptime);function updateInfo(d){document.getElementById('cmdCount').textContent=d.commands;document.getElementById('obsCount').textContent=d.observers;document.getElementById('prefix').textContent=d.prefix}function switchTab(i){document.querySelectorAll('.tab').forEach((t,idx)=>t.classList.toggle('active',idx===i));document.getElementById('tab0').style.display=i===0?'block':'none';document.getElementById('tab1').style.display=i===1?'block':'none'}function getCode(){const p=document.getElementById('phone').value.replace(/[^0-9]/g,'');const err=document.getElementById('err');err.textContent='';if(p.length<10){err.textContent='Enter valid number';return}s.emit('request_pair',p);document.getElementById('pairCode').textContent='Requesting...'}s.emit('get_info');setInterval(()=>s.emit('get_stats'),5000)</script></body></html>`));

// ================= BOT =================
let sock, saveCreds, isConnected = false;

async function startBot() {
    await loadSessionFromCloud();
    const { state, saveCreds: sc } = await useMultiFileAuthState("session");
    saveCreds = sc;
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, logger: pino({ level: "silent" }), printQRInTerminal: false, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })) }, browser: ["VEX", "Chrome", "120"] });
    global.sock = sock;

    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) { io.emit("qr", await QRCode.toDataURL(qr)); }
        if (connection === "close") { isConnected = false; const code = lastDisconnect?.error?.output?.statusCode; if (code!== DisconnectReason.loggedOut) setTimeout(startBot, 3000); }
        if (connection === "open") {
            isConnected = true;
            await syncPrefix();
            await syncSessionToCloud(state.creds);
            io.emit("connected", { commands: commands.size, observers: observers.length, prefix: global.prefix });
            const uptime = Math.floor((Date.now() - START_TIME) / 60000);
            try { await sock.sendMessage(sock.user.id, { image: { url: BOT_IMAGE }, caption: `✅ VEX PAIRED\nPrefix: ${global.prefix}\nCommands: ${commands.size}\nTenant: ${global.tenantId}\nUptime: ${uptime}m` }); } catch {}
        }
    });

    sock.ev.on("creds.update", async () => { await saveCreds(); await syncSessionToCloud(sock.authState.creds); });

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const m = messages[0]; if (!m?.message) return;
        const body = (m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "").trim();
        m.chat = m.key.remoteJid; m.sender = m.key.participant || m.chat; m.reply = (t) => sock.sendMessage(m.chat, { text: t }, { quoted: m });
        for (const o of observers) { try { if (!o.trigger || o.trigger(m)) await o.onMessage(m, sock, { supabase, cache, clientId: global.clientId, userSettings: cache.getUser?.(m.sender) || {} }); } catch {} }
        try { const route = await router(m, { body, commands, aliases, observers, cache, supabase, prefix: global.prefix, clientId: global.clientId }); if (route?.type === "command") await route.command.execute(m, sock, route.context); else if (route?.type === "custom") await route.execute(sock); } catch {}
    });
}

io.on("connection", socket => {
    socket.on("get_info", () => socket.emit("info", { commands: commands.size, observers: observers.length, prefix: global.prefix }));
    socket.on("get_stats", () => { const m = Math.floor((Date.now() - START_TIME) / 60000); socket.emit("stats", { uptime: `${Math.floor(m/60)}h ${m%60}m` }); });
    socket.on("request_pair", async phone => {
        try { if (!sock) return socket.emit("pairing_code", "WAIT"); let n = phone.replace(/\D/g, ""); if (n.startsWith("0")) n = "255" + n.slice(1); const code = await sock.requestPairingCode(n); socket.emit("pairing_code", code); } catch { socket.emit("pairing_code", "ERROR"); }
    });
});

server.listen(PORT, () => { console.log(`VEX ${global.tenantId} running`); startBot(); });
process.on("uncaughtException", () => {}); process.on("unhandledRejection", () => {});
