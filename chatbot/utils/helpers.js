function getBody(m) {

    return (
        m.message?.conversation ||
        m.message?.extendedTextMessage?.text ||
        m.message?.imageMessage?.caption ||
        m.message?.videoMessage?.caption ||
        m.message?.documentMessage?.caption ||
        ""
    );
}

function isGroup(chat) {
    return chat.endsWith("@g.us");
}

function isPrivate(chat) {
    return chat.endsWith("@s.whatsapp.net");
}

function isOwner(sender = "") {

    const owners =
        (process.env.OWNER_NUMBERS || "")
        .split(",");

    return owners.some(num =>
        sender.includes(num.trim())
    );
}

function isCommand(body = "", prefix = ".") {

    if (!body) return false;

    return body.startsWith(prefix);
}

function cleanText(text = "") {

    return String(text)
        .replace(/\s+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function sleep(ms = 1000) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

function randomDelay(min = 1000, max = 4000) {

    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

function shouldIgnore(m) {

    if (!m) return true;

    if (!m.message) return true;

    if (m.key?.remoteJid === "status@broadcast") {
        return true;
    }

    return false;
}

function isFromMe(m) {

    return !!m.key?.fromMe;
}

function normalizeNumber(jid = "") {

    return jid.split("@")[0];
}

function buildPrompt(history = []) {

    return history
        .map(item => {
            return `${item.role}: ${item.content}`;
        })
        .join("\n");
}

function containsBadWord(text = "") {

    const badWords = [
        "fuck",
        "bitch",
        "nigga"
    ];

    return badWords.some(word =>
        text.toLowerCase().includes(word)
    );
}

function pickRandom(arr = []) {

    return arr[
        Math.floor(Math.random() * arr.length)
    ];
}

module.exports = {
    getBody,
    isGroup,
    isPrivate,
    isOwner,
    isCommand,
    cleanText,
    sleep,
    randomDelay,
    shouldIgnore,
    isFromMe,
    normalizeNumber,
    buildPrompt,
    containsBadWord,
    pickRandom
};
