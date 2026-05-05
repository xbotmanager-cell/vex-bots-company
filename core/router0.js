// ========================================================
// VEX SYSTEM - SMART SAAS ROUTER (VEX~ OPTIMIZED)
// Author: Lupin Starnley Jimmoh
// Purpose: Intercepts, adapts, and sanitizes 100+ plugins
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
        userSettings,
        sock
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
    
    const pushName = m.pushName || "User";
    const senderNumber = m.sender?.split("@")[0] || "0";

    // Dynamic Identity Injection
    const modifiedSettings = {
        ...userSettings,
        userName: pushName,
        userNumber: senderNumber,
        botName: userSettings?.M_bot_name || "VEX Bot",
        ownerName: userSettings?.M_owner_name || pushName
    };

    const context = {
        args,
        userSettings: modifiedSettings,
        cache,
        supabase,
        commands,
        prefix,
        pushName,
        isGroup: m.key.remoteJid.endsWith('@g.us'),
        sender: m.sender,
        reply: async (text) => sock.sendMessage(m.key.remoteJid, { text }, { quoted: m })
    };

    // Observer Logic (SaaS Compatible)
    let matchedObservers = [];
    if (observers && (observers.length > 0 || observers.size > 0)) {
        const obsList = Array.isArray(observers) ? observers : Array.from(observers.values());
        for (const obs of obsList) {
            try {
                const triggerCtx = { body, messageType, userSettings: modifiedSettings, cache };
                if (typeof obs.trigger === "function") {
                    if (obs.trigger(m, triggerCtx)) matchedObservers.push(obs);
                } else if (obs.type === messageType || obs.type === "all") {
                    matchedObservers.push(obs);
                }
            } catch (e) {}
        }
    }

    // Command Logic with SaaS Interceptor
    if (isCommand && cmdName) {
        const command = commands.get(cmdName);

        if (command && typeof command.execute === "function") {
            // PROXY: Intercepts outgoing messages to replace "Lupin" with Subscriber info
            const sockProxy = new Proxy(sock, {
                get(target, prop) {
                    if (prop === 'sendMessage') {
                        return async (jid, content, options) => {
                            if (content && typeof content.text === 'string') {
                                content.text = content.text
                                    .replace(/Lupin/gi, modifiedSettings.ownerName)
                                    .replace(/Mentor Brian/gi, modifiedSettings.ownerName);
                            }
                            return target.sendMessage(jid, content, options);
                        };
                    }
                    return target[prop];
                }
            });

            return {
                type: "command",
                command,
                context: {
                    ...context,
                    sock: sockProxy,
                    execute: () => command.execute(m, sockProxy, context)
                }
            };
        }
    }

    if (matchedObservers.length > 0) {
        return {
            type: "observer",
            list: matchedObservers,
            context
        };
    }

    return { type: "ignore" };
};

function getMessageType(m) {
    const msg = m.message || {};
    const type = Object.keys(msg)[0];
    const types = {
        conversation: "text",
        imageMessage: "image",
        videoMessage: "video",
        audioMessage: "audio",
        documentMessage: "document",
        extendedTextMessage: "text",
        protocolMessage: "protocol",
        stickerMessage: "sticker",
        viewOnceMessageV2: "viewOnce",
        viewOnceMessageV2Extension: "viewOnce"
    };
    return types[type] || "unknown";
}
