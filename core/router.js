/**
 * VEX ROUTER (ESM Version)
 * All logic remains the same, syntax updated for Node 22 + Baileys v7
 */

export default async function router(m, ctx) {
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

    // ⚡ ALIAS RESOLVE (FAST MAP)
    const cmdName = aliases.get(cmdNameRaw) || cmdNameRaw;

    const messageType = getMessageType(m);

    // ⚡ SAFE USER SETTINGS
    let userSettings = {};
    try {
        userSettings = cache.getUser?.(m.sender) || {};
    } catch {}

    // ⚡ CONTEXT (NO HEAVY OBJECTS)
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

    if (observers.length > 0) {
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
                    matchedObservers.push(obs);
                }
            } catch {}
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

        // ❌ unknown command → silent ignore (no crash)
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
}

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
