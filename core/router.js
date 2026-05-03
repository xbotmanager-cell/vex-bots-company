module.exports = async function router(m, ctx) {
    const {
        body,
        commands,
        aliases,
        observers,
        cache,
        supabase,
        prefix // Prefix inayotoka index.js (global.prefix)
    } = ctx;

    // ================= BASIC INFO =================

    const isText = typeof body === "string" && body.length > 0;

    // LUPIN LOGIC: Inatambua prefix yoyote ile (Super Fast)
    const isCommand = isText && body.startsWith(prefix);
    const commandBody = isCommand ? body.slice(prefix.length).trim() : "";
    const args = commandBody.split(/ +/);
    const cmdNameRaw = args.shift()?.toLowerCase();

    const cmdName = aliases.get(cmdNameRaw) || cmdNameRaw;

    const messageType = getMessageType(m);

    const userSettings = cache.getUser(m.sender);

    const context = {
        args,
        userSettings,
        cache,
        supabase,
        commands,
        prefix // Tunapitisha prefix pia kwenye plugins
    };

    // ================= 1. OBSERVER FILTER =================

    const matchedObservers = [];

    for (const obs of observers) {
        try {
            // Each observer defines its own trigger
            if (typeof obs.trigger === "function") {
                const shouldRun = obs.trigger(m, {
                    body,
                    messageType,
                    userSettings,
                    cache
                });

                if (shouldRun) matchedObservers.push(obs);
            } else {
                // fallback: run if no trigger defined
                matchedObservers.push(obs);
            }

        } catch (e) {
            console.error(`Observer Trigger Error:`, e.message);
        }
    }

    // ================= 2. COMMAND HANDLING =================

    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command) {
            return {
                type: "command",
                command,
                context
            };
        }

        // Unknown command → ignore silently
        return { type: "ignore" };
    }

    // ================= 3. OBSERVER EXECUTION =================

    if (matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    // ================= 4. DEFAULT =================

    return { type: "ignore" };
};

// ================= HELPER =================

function getMessageType(m) {
    if (m.message?.protocolMessage) return "protocol";
    if (m.message?.viewOnceMessageV2 || m.message?.viewOnceMessageV2Extension) return "viewOnce";
    if (m.message?.imageMessage) return "image";
    if (m.message?.videoMessage) return "video";
    if (m.message?.extendedTextMessage || m.message?.conversation) return "text";
    return "unknown";
}
