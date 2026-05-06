/**
 * VEX ROUTER (CommonJS Version)
 * Inasimamia uelekezaji wa amri na observers kwenda kwenye plugins husika.
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

    // ================= BASIC =================
    const isText = typeof body === "string" && body.length > 0;

    // ⚡ FAST PREFIX CHECK
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

    // ⚡ ALIAS RESOLVE (Inatafuta kama amri ina jina mbadala)
    const cmdName = aliases.get(cmdNameRaw) || cmdNameRaw;

    const messageType = getMessageType(m);

    // ⚡ SAFE USER SETTINGS
    let userSettings = {};
    try {
        userSettings = cache.getUser?.(m.sender) || {};
    } catch (e) {
        userSettings = {};
    }

    // ⚡ CONTEXT (Data zinazotumwa kwenda kwenye plugin)
    const context = {
        args,
        userSettings,
        cache,
        supabase,
        commands,
        prefix
    };

    // ================= OBSERVER MATCHING =================
    let matchedObservers = null;

    if (observers && observers.length > 0) {
        matchedObservers = [];

        for (let i = 0; i < observers.length; i++) {
            const obs = observers[i];

            try {
                if (typeof obs.trigger === "function") {
                    if (obs.trigger(m, {
                        body,
                        messageType,
                        userSettings,
                        cache
                    })) {
                        matchedObservers.push(obs);
                    }
                } else {
                    // Kama haina trigger function, tunaichukulia kama inasikiliza kila kitu
                    matchedObservers.push(obs);
                }
            } catch (err) {
                // Ignore observer errors
            }
        }
    }

    // ================= COMMAND EXECUTION LOGIC =================
    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            return {
                type: "command",
                command,
                context
            };
        }

        // ❌ Kama amri haipo, tunakausha tu (silent ignore)
        return { type: "ignore" };
    }

    // ================= OBSERVERS EXECUTION LOGIC =================
    if (matchedObservers && matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    // ================= DEFAULT =================
    return { type: "ignore" };
}

/**
 * HELPER: Kutambua aina ya ujumbe unaoingia
 */
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

// Hamisha router ili itumike na require() kwenye index.js
module.exports = router;
