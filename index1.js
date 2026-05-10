// ============================================
// VEX TENANT CLIENT - index1.js
// Dev: Lupin Starnley | For: VEX BOT COMPANY
// ============================================

// ================= CLIENT MODE SETUP =================
process.env.IS_CLIENT = 'true';
process.env.TENANT_ID = process.env.TENANT_ID || process.env.RENDER_SERVICE_NAME || 'vex_client_default';

// ================= CORE MODULES =================
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// ================= LOAD MASTER SUPABASE =================
const MASTER_URL = process.env.MASTER_SUPABASE_URL || process.env.SUPABASE_URL;
const MASTER_KEY = process.env.MASTER_SUPABASE_KEY || process.env.SUPABASE_KEY;

if (!MASTER_URL || !MASTER_KEY) {
    console.error("❌ MASTER_SUPABASE_URL na MASTER_SUPABASE_KEY zinahitajika");
    process.exit(1);
}

const masterSupabase = createClient(MASTER_URL, MASTER_KEY);

// ================= BOOT LOADER: LOAD CONFIG FROM vex_config =================
async function loadGlobalConfig() {
    try {
        const { data, error } = await masterSupabase.from('vex_config').select('key, value');
        if (error) throw error;
        
        data.forEach(item => {
            if (!process.env[item.key]) process.env[item.key] = item.value;
        });
        
        console.log(`✅ VEX CONFIG: Loaded ${data.length} keys from Supabase`);
    } catch (e) {
        console.error("❌ Failed to load vex_config:", e.message);
    }
}

// ================= TENANT WRAPPER =================
async function initTenantSystem() {
    // 1. Set tenant_id kwa Postgres session
    await masterSupabase.rpc('set_tenant', { tenant_name: process.env.TENANT_ID });
    
    // 2. Override global.clientId
    global.clientId = process.env.TENANT_ID;
    global.tenantId = process.env.TENANT_ID;
    
    // 3. Wrap Supabase - Auto inject tenant_id
    const originalFrom = masterSupabase.from.bind(masterSupabase);
    masterSupabase.from = function(table) {
        if (table === 'vex_config') return originalFrom(table); // Config ni global
        
        const query = originalFrom(table);
        const TENANT = process.env.TENANT_ID;
        
        const originalInsert = query.insert.bind(query);
        query.insert = (data) => {
            if (Array.isArray(data)) {
                data = data.map(d => ({ ...d, tenant_id: TENANT }));
            } else {
                data.tenant_id = TENANT;
            }
            return originalInsert(data);
        };
        
        const originalSelect = query.select.bind(query);
        query.select = (...args) => originalSelect(...args).eq('tenant_id', TENANT);
        
        const originalUpdate = query.update.bind(query);
        query.update = (data) => originalUpdate(data).eq('tenant_id', TENANT);
        
        const originalDelete = query.delete.bind(query);
        query.delete = () => originalDelete().eq('tenant_id', TENANT);
        
        const originalUpsert = query.upsert.bind(query);
        query.upsert = (data, opt) => {
            if (Array.isArray(data)) {
                data = data.map(d => ({ ...d, tenant_id: TENANT }));
            } else {
                data.tenant_id = TENANT;
            }
            return originalUpsert(data, opt);
        };
        
        return query;
    };
    
    // 4. Replace global supabase
    global.supabase = masterSupabase;
    global.masterSupabase = masterSupabase;
    
    console.log(`🔥 TENANT MODE: ${process.env.TENANT_ID} ACTIVE`);
}

// ================= CUSTOM UI SERVER - GLASSMORPHISM =================
function startCustomServer() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    const PORT = process.env.PORT || 10000;
    
    const DEPLOY_KEY = process.env.DEPLOY_KEY || 'vex_secret_2026';
    const BOT_IMAGE = 'https://i.ibb.co/Myk40VZF/Chat-GPT-Image-May-10-2026-12-07-48-PM.png';
    const WHATSAPP = '255780470905';
    
    // MIDDLEWARE: LINDA RENDER LINK
    app.use((req, res, next) => {
        // Ruhusu socket.io na static
        if (req.path.startsWith('/socket.io')) return next();
        
        // Check deploy key
        if (req.query.k !== DEPLOY_KEY && req.path !== '/blocked') {
            return res.redirect('/blocked');
        }
        next();
    });
    
    // PAGE YA KUMKATA MGENI
    app.get('/blocked', (req, res) => {
        res.status(403).send(`<!DOCTYPE html>
<html>
<head>
<title>Access Denied - VEX HOST</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{
    min-height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
    background:#0a0014;
    background-image: 
        radial-gradient(circle at 20% 50%, #4a0080 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, #6a00ff 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, #8a00ff 0%, transparent 50%);
    font-family:'Orbitron',monospace;
    color:#fff;
    overflow:hidden;
}
.card{
    padding:40px;
    border-radius:30px;
    background:rgba(255,255,255,0.05);
    backdrop-filter:blur(20px);
    border:1px solid rgba(138,0,255,0.3);
    box-shadow:0 0 60px rgba(138,0,255,0.4), inset 0 0 60px rgba(138,0,255,0.1);
    text-align:center;
    max-width:500px;
    animation:float 3s ease-in-out infinite;
}
@keyframes float{
    0%,100%{transform:translateY(0)}
    50%{transform:translateY(-20px)}
}
h1{
    font-size:2.5em;
    font-weight:900;
    background:linear-gradient(90deg,#ff00ff,#8a00ff,#00ffff);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    margin-bottom:20px;
    text-shadow:0 0 30px rgba(255,0,255,0.5);
}
p{font-size:1.1em;color:#c0a0ff;margin:15px 0;line-height:1.6}
.icon{font-size:5em;margin:20px 0;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
</style>
</head>
<body>
<div class="card">
    <div class="icon">🛡️</div>
    <h1>ACCESS DENIED</h1>
    <p>Hii link ni ya mteja aliyelipa tu.</p>
    <p>Nunua VEX BOT yako sasa kupata access.</p>
    <p style="margin-top:30px;color:#ff00ff;">VEX HOST © 2026</p>
</div>
</body>
</html>`);
    });
    
    // MAIN PAGE - QR + PAIRING
    app.get('/', async (req, res) => {
        res.send(`<!DOCTYPE html>
<html>
<head>
<title>VEX HOST - ${process.env.TENANT_ID}</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="/socket.io/socket.io.js"></script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;500;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{
    min-height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
    background:#0a0014;
    background-image: 
        radial-gradient(circle at 20% 50%, #4a0080 0%, transparent 50%),
        radial-gradient(circle at 80% 80%, #6a00ff 0%, transparent 50%),
        radial-gradient(circle at 40% 20%, #8a00ff 0%, transparent 50%);
    font-family:'Rajdhani',sans-serif;
    color:#fff;
    padding:20px;
}
.container{
    width:100%;
    max-width:900px;
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:30px;
    align-items:center;
}
@media(max-width:768px){.container{grid-template-columns:1fr}}
.card{
    padding:30px;
    border-radius:25px;
    background:rgba(255,255,255,0.05);
    backdrop-filter:blur(20px);
    border:1px solid rgba(138,0,255,0.3);
    box-shadow:0 0 60px rgba(138,0,255,0.4), inset 0 0 60px rgba(138,0,255,0.1);
}
.profile{
    text-align:center;
}
.profile img{
    width:150px;
    height:150px;
    border-radius:50%;
    border:3px solid #8a00ff;
    box-shadow:0 0 40px rgba(138,0,255,0.6);
    margin-bottom:20px;
    animation:glow 2s ease-in-out infinite;
}
@keyframes glow{
    0%,100%{box-shadow:0 0 40px rgba(138,0,255,0.6)}
    50%{box-shadow:0 0 60px rgba(255,0,255,0.8)}
}
h1{
    font-family:'Orbitron',monospace;
    font-size:2em;
    font-weight:900;
    background:linear-gradient(90deg,#ff00ff,#8a00ff,#00ffff);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    margin-bottom:10px;
}
.tenant{
    font-size:0.9em;
    color:#8a00ff;
    margin-bottom:20px;
    word-break:break-all;
}
.status{
    padding:15px;
    border-radius:15px;
    background:rgba(138,0,255,0.2);
    border:1px solid rgba(138,0,255,0.4);
    margin:20px 0;
    font-weight:700;
    font-size:1.1em;
}
.qr-box{
    text-align:center;
    padding:20px;
    background:rgba(0,0,0,0.3);
    border-radius:20px;
    margin:20px 0;
}
.qr-box img{
    width:100%;
    max-width:280px;
    border-radius:15px;
    box-shadow:0 0 30px rgba(138,0,255,0.5);
}
.pair-box{
    margin:20px 0;
}
.pair-box input{
    width:100%;
    padding:15px;
    border-radius:12px;
    border:1px solid rgba(138,0,255,0.4);
    background:rgba(0,0,0,0.4);
    color:#fff;
    font-size:1.1em;
    font-family:'Orbitron',monospace;
    text-align:center;
    margin-bottom:10px;
}
.btn{
    width:100%;
    padding:15px;
    border:none;
    border-radius:12px;
    background:linear-gradient(90deg,#8a00ff,#ff00ff);
    color:#fff;
    font-size:1.1em;
    font-weight:700;
    font-family:'Orbitron',monospace;
    cursor:pointer;
    transition:all 0.3s;
    box-shadow:0 0 20px rgba(138,0,255,0.5);
}
.btn:hover{
    transform:translateY(-2px);
    box-shadow:0 0 40px rgba(255,0,255,0.7);
}
.dev{
    text-align:center;
    margin-top:20px;
    padding-top:20px;
    border-top:1px solid rgba(138,0,255,0.3);
}
.dev p{color:#c0a0ff;margin:5px 0}
.whatsapp{
    display:inline-block;
    margin-top:15px;
    padding:12px 30px;
    background:#25D366;
    color:#fff;
    text-decoration:none;
    border-radius:12px;
    font-weight:700;
    transition:all 0.3s;
}
.whatsapp:hover{
    transform:scale(1.05);
    box-shadow:0 0 30px rgba(37,211,102,0.6);
}
.tabs{
    display:flex;
    gap:10px;
    margin-bottom:20px;
}
.tab{
    flex:1;
    padding:12px;
    background:rgba(138,0,255,0.2);
    border:1px solid rgba(138,0,255,0.4);
    border-radius:10px;
    cursor:pointer;
    text-align:center;
    font-weight:700;
    transition:all 0.3s;
}
.tab.active{
    background:linear-gradient(90deg,#8a00ff,#ff00ff);
    box-shadow:0 0 20px rgba(138,0,255,0.5);
}
.tab-content{display:none}
.tab-content.active{display:block}
</style>
</head>
<body>
<div class="container">
    <div class="card profile">
        <img src="${BOT_IMAGE}" alt="VEX BOT">
        <h1>VEX HOST</h1>
        <div class="tenant">${process.env.TENANT_ID}</div>
        <div class="status" id="status">⏳ INITIALIZING...</div>
        <div class="dev">
            <p>Dev: Lupin Starnley</p>
            <a href="https://wa.me/${WHATSAPP}" target="_blank" class="whatsapp">💬 WhatsApp Support</a>
        </div>
    </div>
    
    <div class="card">
        <div class="tabs">
            <div class="tab active" onclick="switchTab('qr')">QR CODE</div>
            <div class="tab" onclick="switchTab('pair')">PAIRING CODE</div>
        </div>
        
        <div class="tab-content active" id="qr-tab">
            <div class="qr-box">
                <img id="qr" style="display:none;" alt="QR Code">
                <p id="qr-text" style="color:#8a00ff;margin-top:15px;">Waiting for QR...</p>
            </div>
        </div>
        
        <div class="tab-content" id="pair-tab">
            <div class="pair-box">
                <input type="text" id="phone" placeholder="255XXX XXX XXX">
                <button class="btn" onclick="requestPair()">GET PAIRING CODE</button>
                <div id="pair-result" style="margin-top:15px;text-align:center;font-size:1.5em;font-weight:900;color:#ff00ff;"></div>
            </div>
        </div>
    </div>
</div>

<script>
const socket = io();
const qr = document.getElementById('qr');
const qrText = document.getElementById('qr-text');
const status = document.getElementById('status');

socket.on('qr', d => {
    qr.src = d;
    qr.style.display = 'block';
    qrText.innerText = '📱 Scan na WhatsApp yako';
    status.innerText = '📲 SCAN QR CODE';
    status.style.color = '#ff00ff';
});

socket.on('pairing_code', code => {
    document.getElementById('pair-result').innerText = code;
    status.innerText = '🔢 PAIRING CODE READY';
});

socket.on('connected', () => {
    qr.style.display = 'none';
    qrText.innerText = '✅ Connected Successfully!';
    status.innerText = '✅ BOT CONNECTED';
    status.style.color = '#00ff00';
    document.getElementById('pair-result').innerText = '✅ Connected!';
});

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById(tab + '-tab').classList.add('active');
}

function requestPair() {
    const phone = document.getElementById('phone').value.replace(/[^0-9]/g, '');
    if(phone.length < 10) return alert('Namba si sahihi');
    socket.emit('request_pair', phone);
}
</script>
</body>
</html>`);
    });
    
    // SOCKET.IO EVENTS
    io.on('connection', (socket) => {
        socket.on('request_pair', async (phone) => {
            // Hii itaunganishwa na Baileys requestPairingCode
            if (global.sock && global.sock.requestPairingCode) {
                try {
                    const code = await global.sock.requestPairingCode(phone);
                    socket.emit('pairing_code', code);
                } catch (e) {
                    socket.emit('pairing_code', 'ERROR');
                }
            }
        });
    });
    
    // Export io kwa index.js
    global.io = io;
    
    server.listen(PORT, () => {
        console.log(`🚀 VEX Server running on port ${PORT} for tenant: ${process.env.TENANT_ID}`);
    });
}

// ================= MAIN EXECUTION =================
(async () => {
    await loadGlobalConfig();
    await initTenantSystem();
    startCustomServer();
    
    // Load original index.js yako
    require('./index.js');
})();
