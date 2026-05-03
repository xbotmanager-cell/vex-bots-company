module.exports = async function router(m, ctx) {
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

    // ⚡ FAST PREFIX CHECK (safe)
    const isCommand = isText && prefix && body.startsWith(prefix);

    let cmdNameRaw = "";
    let args = [];

    if (isCommand) {
        const sliced = body.slice(prefix.length).trim();

        if (sliced) {
            const parts = sliced.split(/\s+/);
            cmdNameRaw = (parts.shift() || "").toLowerCase();
            args = parts;
        }
    }

    // ⚡ ALIAS RESOLVE (FAST MAP SAFE)
    const cmdName = aliases.get(cmdNameRaw) || cmdNameRaw;

    const messageType = getMessageType(m);

    // ⚡ SAFE USER SETTINGS (NO CRASH)
    let userSettings = {};
    try {
        userSettings = cache?.getUser?.(m.sender) || {};
    } catch {}

    // ⚡ CONTEXT (LIGHTWEIGHT)
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

    if (Array.isArray(observers) && observers.length > 0) {
        matchedObservers = [];

        for (let i = 0; i < observers.length; i++) {
            const obs = observers[i];

            try {
                if (typeof obs.trigger === "function") {
                    const shouldRun = obs.trigger(m, {
                        body,
                        messageType,
                        userSettings,
                        cache
                    });

                    if (shouldRun) matchedObservers.push(obs);
                } else {
                    // fallback (keep original behavior)
                    matchedObservers.push(obs);
                }
            } catch {
                // silent (no crash)
            }
        }
    }

    // ================= COMMAND =================

    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            return {
                type: "command",
                command,
                context
            };
        }

        // ❌ unknown command → silent ignore
        return { type: "ignore" };
    }

    // ================= OBSERVERS =================

    if (matchedObservers && matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    // ================= DEFAULT =================
    return { type: "ignore" };
};

// ================= HELPER =================

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
