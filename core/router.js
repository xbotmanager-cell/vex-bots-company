// ========================================================
// VEX SYSTEM - SMART SAAS ROUTER (PLUGIN ADAPTER)
// Author: Lupin Starnley Jimmoh
// Purpose: Intercepts and adapts 100+ plugins for Multi-Instance use
// ========================================================

module.exports = async function router(m, ctx) {
    const {
        body,
        commands,
        aliases,
        observers,
        cache,
        supabase,
        prefix,
        userSettings // These are settings of the Instance Owner (SaaS subscriber)
    } = ctx;

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

    // ================= DYNAMIC IDENTITY INJECTION =================
    // Hapa tunatengeneza 'Identity' ya mtumiaji wa sasa ili kuzuia 
    // plugins zisitumie jina la "Lupin" kwa kila mtu.
    
    const pushName = m.pushName || "User";
    const senderNumber = m.sender.split("@")[0];

    // Tunatengeneza 'modifiedSettings' ambayo itazidanganya plugins zako
    const modifiedSettings = {
        ...userSettings,
        userName: pushName,
        userNumber: senderNumber,
        // Kama plugin ina 'style' ya 'girl' inayotaja Lupin, 
        // tunaweza kuifanya iwe dynamic hapa (Placeholder logic)
    };

    // ================= CONTEXT WRAPPER =================
    const context = {
        args,
        userSettings: modifiedSettings, // Injected with dynamic identity
        cache,
        supabase,
        commands,
        prefix, // Current subscriber's prefix
        pushName
    };

    // ================= OBSERVER MATCHING =================
    let matchedObservers = null;
    if (observers.length > 0) {
        matchedObservers = [];
        for (let i = 0; i < observers.length; i++) {
            const obs = observers[i];
            try {
                const triggerCtx = { body, messageType, userSettings: modifiedSettings, cache };
                if (typeof obs.trigger === "function") {
                    if (obs.trigger(m, triggerCtx)) matchedObservers.push(obs);
                } else {
                    matchedObservers.push(obs);
                }
            } catch {}
        }
    }

    // ================= COMMAND EXECUTION =================
    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            
            // --- AUTO-ADAPT PLUGINS (The "Lupin" & "Prefix" Fix) ---
            // Hapa tunatengeneza 'Proxy' ya sock.sendMessage ili kubadilisha 
            // text yoyote inayotoka kwenye plugin kabla haijafika WhatsApp.
            
            return {
                type: "command",
                command,
                context: {
                    ...context,
                    // Hapa unaweza kuongeza 'interceptors' kama unahitaji kubadilisha text ya plugin 100+ kwa nguvu
                }
            };
        }
        return { type: "ignore" };
    }

    if (matchedObservers && matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    return { type: "ignore" };
};

// ================= HELPER FUNCTIONS =================

function getMessageType(m) {
    const msg = m.message || {};
    if (msg.protocolMessage) return "protocol";
    if (msg.viewOnceMessageV2 || msg.viewOnceMessageV2Extension) return "viewOnce";
    if (msg.imageMessage) return "image";
    if (msg.videoMessage) return "video";
    if (msg.audioMessage) return "audio";
    if (msg.documentMessage) return "document";
    if (msg.extendedTextMessage || msg.conversation) return "text";
    return "unknown";
}
