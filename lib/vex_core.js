/**
 * VEX MINI BOT - NEURAL CORE
 * Path: lib/vex_core.js
 */

const pino = require("pino");
const fs = require("fs");
const path = require("path");

async function connectToVex(socketIO, commands) {
    const baileys = await import("@whiskeysockets/baileys");
    const makeWASocket = baileys.default?.default || baileys.default;
    const { 
        useMultiFileAuthState, 
        makeCacheableSignalKeyStore, 
        PHONENUMBER_MCC, 
        DisconnectReason 
    } = baileys;

    const sessionPath = path.join(__dirname, '../session');
    if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    const vex = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" })),
        },
        printQRInTerminal: false,
        logger: pino({ level: "fatal" }),
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        syncFullHistory: false,
        markOnlineOnConnect: true
    });

    socketIO.on('connection', (socket) => {
        socket.on('getPairing', async (num) => {
            if (!vex.authState.creds.registered) {
                let cleanNumber = num.replace(/\D/g, '');
                try {
                    let code = await vex.requestPairingCode(cleanNumber);
                    code = code?.match(/.{1,4}/g)?.join("-") || code;
                    socket.emit('pairingCode', code); 
                } catch (err) {
                    socket.emit('error', 'Failed to generate code.');
                }
            }
        });
    });

    vex.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) socketIO.emit('qr', qr);

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                setTimeout(() => connectToVex(socketIO, commands), 5000);
            }
        } else if (connection === 'open') {
            socketIO.emit('connected');
            console.log('VEX ONLINE ✅');
        }
    });

    // REKEBISHO HAPA: Inasoma handler kutoka folder hilohilo la lib
    const { vexHandler } = require('./handler'); 
    vex.ev.on('messages.upsert', async (m) => {
        await vexHandler(vex, m, socketIO, commands);
    });

    vex.ev.on('creds.update', saveCreds);
    return vex;
}

module.exports = { connectToVex };
