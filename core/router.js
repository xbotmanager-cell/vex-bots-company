/**
 * VEX SMART ROUTER - MULTI-TENANT EDITION
 * Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Hii router inalazimisha kila plugin kusoma Client ID bila kubadili code ya plugin husika.
 */

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

    // 1. FETCH ENVIRONMENT IDENTITY (Hutagusa code, itasoma toka Render ENV)
    const CLIENT_ID = process.env.CLIENT_ID || "GLOBAL";
    const DEVELOPER_NUMBER = "255780470905"; // Weka namba yako hapa

    // 2. BASIC PRE-PROCESSING
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

    // 3. ROLE & PERMISSION CHECK
    const sender = m.sender || "";
    const userRole = sender.includes(DEVELOPER_NUMBER) ? "owner" : "user";

    // 4. SMART CONTEXT INJECTION (The Secret Sauce)
    // Hapa ndipo tunapopitisha data kwa lazima kwenda kwenye plugins zote
    const context = {
        ...ctx,      // Data za mwanzo
        args,        // Arguments zilizosafishwa
        clientId: CLIENT_ID, // ID ya mteja (kutoka Render ENV)
        userRole: userRole,   // Role ya mtumiaji (Owner/User)
        userSettings: cache.getUser?.(sender) || {},
        
        // 5. SUPABASE WRAPPER (Optional: Inalazimisha filter ya Client ID)
        // Hii inahakikisha hata plugin iweje, itasoma data za huyu mteja tu
        db: (tableName) => supabase.from(tableName).select('*').eq('client_id', CLIENT_ID)
    };

    // 6. OBSERVER MATCHING
    let matchedObservers = [];
    if (observers && observers.length > 0) {
        for (const obs of observers) {
            try {
                const shouldTrigger = typeof obs.trigger === "function" 
                    ? obs.trigger(m, { body, messageType, cache, clientId: CLIENT_ID }) 
                    : true;

                if (shouldTrigger) matchedObservers.push(obs);
            } catch (err) { /* Silent ignore */ }
        }
    }

    // 7. COMMAND EXECUTION
    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            // Check if command is Owner Only
            if (command.category === "owner" && userRole !== "owner") {
                return { type: "ignore" };
            }

            return {
                type: "command",
                command,
                context
            };
        }
        return { type: "ignore" };
    }

    // 8. OBSERVER EXECUTION
    if (matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    return { type: "ignore" };
}

/**
 * HELPER: Kutambua aina ya ujumbe
 */
function getMessageType(m) {
    const msg = m.message || {};
    if (msg.protocolMessage) return "protocol";
    if (msg.viewOnceMessageV2) return "viewOnce";
    if (msg.imageMessage) return "image";
    if (msg.videoMessage) return "video";
    if (msg.audioMessage) return "audio";
    if (msg.documentMessage) return "document";
    if (msg.extendedTextMessage || msg.conversation) return "text";
    return "unknown";
}

module.exports = router;
