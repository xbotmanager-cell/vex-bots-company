/**
 * VEX SMART ROUTER - ERROR SHIELD, MULTI-TENANT & AI BRIDGE
 * Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Location: core/router.js
 */

// Step 2: Import Vex Bridge (Iliyo kwenye folder moja na router)
const vexBridge = require('./vex_bridge');

async function router(m, ctx) {
    const {
        body,
        commands,
        aliases,
        observers,
        cache,
        supabase,
        prefix
    } = ctx;

    // 1. IDENTITY & CONFIG
    const CLIENT_ID = process.env.CLIENT_ID || "GLOBAL";
    const DEVELOPER_NUMBER = "255780470905"; 

    // 2. ERROR SHIELD FOR SUPABASE (STAYED UNTOUCHED)
    const safeSupabase = new Proxy(supabase, {
        get(target, prop) {
            if (prop === 'from') {
                return (tableName) => {
                    const originalFrom = target.from(tableName);
                    const proxyHandler = {
                        get(subTarget, subProp) {
                            const originalMethod = subTarget[subProp];
                            if (typeof originalMethod === 'function') {
                                return (...args) => {
                                    try {
                                        const result = originalMethod.apply(subTarget, args);
                                        if (result && typeof result.catch === 'function') {
                                            return result.catch(err => {
                                                console.error(`⚠️ [VEX IGNORED ERROR] Table: ${tableName} | Op: ${subProp} | Msg: ${err.message}`);
                                                return { data: null, error: err };
                                            });
                                        }
                                        return result;
                                    } catch (err) {
                                        console.error(`⚠️ [VEX SYNC ERROR] Table: ${tableName} | Msg: ${err.message}`);
                                        return { data: null, error: err };
                                    }
                                };
                            }
                            return originalMethod;
                        }
                    };
                    return new Proxy(originalFrom, proxyHandler);
                };
            }
            return target[prop];
        }
    });

    // 3. SET DATABASE SESSION (Silent attempt)
    try {
        await safeSupabase.rpc('set_config', { name: 'app.client_id', value: CLIENT_ID, is_local: true }).catch(() => {});
    } catch (e) {}

    // 4. BASIC PROCESSING
    const isText = typeof body === "string" && body.length > 0;
    const isCommand = isText && body.startsWith(prefix);
    let cmdNameRaw = "";
    let args = [];

    if (isCommand) {
        const sliced = body.slice(prefix.length).trim();
        if (sliced.length > 0) {
            const parts = sliced.split(/\s+/);
            cmdNameRaw = parts.shift()?.toLowerCase() || "";
            args = parts;
        }
    }

    const cmdName = aliases.get(cmdNameRaw) || cmdNameRaw;
    const messageType = getMessageType(m);
    const sender = m.sender || "";
    const userRole = sender.includes(DEVELOPER_NUMBER) ? "owner" : "user";

    // 5. CONTEXT WITH SAFE SUPABASE
    const context = {
        ...ctx,
        args,
        clientId: CLIENT_ID,
        userRole: userRole,
        userSettings: cache.getUser?.(sender) || {},
        supabase: safeSupabase 
    };

    // 6. EXECUTION LOGIC (Commands & Observers)
    let matchedObservers = [];
    if (observers) {
        for (const obs of observers) {
            try {
                if (!obs.trigger || obs.trigger(m, { body, messageType, cache, clientId: CLIENT_ID })) {
                    matchedObservers.push(obs);
                }
            } catch (e) {}
        }
    }

    // A: Traditional Command Execution
    if (isCommand && cmdName) {
        // 🔥 FIX: Check if command exists first
        const command = commands.get(cmdName);
        if (command && typeof command.execute === "function") {
            if (command.category === "owner" && userRole !== "owner") return { type: "ignore" };
            return { type: "command", command, context };
        }
        
        // 🔥 NEW FEATURE: If user typed .vex hello, handle it via bridge if no plugin exists
        if (cmdName === "vex") {
            const aiQuery = args.join(" ");
            if (aiQuery) {
                return {
                    type: "custom",
                    execute: async (sock) => {
                        try {
                            const aiResponse = await vexBridge.askAI(aiQuery, context);
                            await sock.sendMessage(m.chat, { text: aiResponse }, { quoted: m });
                        } catch (err) {
                            console.error("VEX ROUTER AI CMD ERROR:", err.message);
                        }
                    }
                };
            }
        }
    }

    // B: Observers Execution
    if (matchedObservers.length > 0) {
        return { type: "observer", list: matchedObservers, context };
    }

    // ============================================================
    // NEW STEP 2 LOGIC: AI FALLBACK (NO PREFIX HANDLER)
    // ============================================================
    
    // Kama message haina prefix lakini ni text, tunampa Vex Bridge aichambue
    if (isText && !isCommand) {
        const triggerVex = body.toLowerCase().includes("vex") || context.userSettings?.chatbot_mode === true;
        
        if (triggerVex) {
            return {
                type: "custom",
                execute: async (sock) => {
                    try {
                        const aiResponse = await vexBridge.askAI(body, context);
                        await sock.sendMessage(m.chat, { text: aiResponse }, { quoted: m });
                    } catch (err) {
                        console.error("VEX ROUTER AI ERROR:", err.message);
                    }
                }
            };
        }
    }

    return { type: "ignore" };
}

function getMessageType(m) {
    const msg = m.message || {};
    if (msg.imageMessage) return "image";
    if (msg.videoMessage) return "video";
    if (msg.audioMessage) return "audio";
    if (msg.extendedTextMessage || msg.conversation) return "text";
    return "unknown";
}

module.exports = router;
