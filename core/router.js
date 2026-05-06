/**
 * VEX SMART ROUTER - MULTI-TENANT EDITION (STABLE)
 * Logic: Lupin Starnley Jimmoh (VEX CEO)
 * Hii router sasa ni mtiifu kwa plugins zote huku ikilinda mfumo wa Client ID.
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

    // 1. FETCH IDENTITY
    const CLIENT_ID = process.env.CLIENT_ID || "GLOBAL";
    const DEVELOPER_NUMBER = "255780470905"; 

    // 2. SET DATABASE SESSION (Hii inaitambia SQL yako ya RLS nani anafanya kazi sasa hivi)
    // Tunatumia rpc au query ya siri kuweka setting ya session kwenye Postgres
    try {
        await supabase.rpc('set_config', { name: 'app.client_id', value: CLIENT_ID, is_local: true }).catch(() => {});
    } catch (e) { /* Silent */ }

    // 3. BASIC PRE-PROCESSING
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

    // 4. ROLE CHECK
    const sender = m.sender || "";
    const userRole = sender.includes(DEVELOPER_NUMBER) ? "owner" : "user";

    // 5. SAFE CONTEXT INJECTION
    // Hapa 'supabase' inabaki kuwa ile ile original ili plugins zisitoe error
    const context = {
        ...ctx,
        args,
        clientId: CLIENT_ID,
        userRole: userRole,
        userSettings: cache.getUser?.(sender) || {},
        supabase: supabase // Plugins zitaendelea kuitumia kama kawaida
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
            } catch (err) { /* Ignore */ }
        }
    }

    // 7. COMMAND EXECUTION
    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            // Category protection
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

    // 8. OBSERVERS EXECUTION
    if (matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    return { type: "ignore" };
}

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
