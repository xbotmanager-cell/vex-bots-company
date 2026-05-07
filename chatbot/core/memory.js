const memory = new Map();

function ensureUser(user) {

    if (!memory.has(user)) {

        memory.set(user, {
            messages: [],
            cooldown: 0,
            warned: false,
            lastReply: null,
            lastMessageAt: Date.now(),
            totalMessages: 0
        });
    }

    return memory.get(user);
}

function addMessage(user, role, content) {

    const data = ensureUser(user);

    data.messages.push({
        role,
        content,
        time: Date.now()
    });

    // LIMIT MEMORY
    if (data.messages.length > 20) {
        data.messages.shift();
    }

    data.lastMessageAt = Date.now();

    if (role === "user") {
        data.totalMessages++;
    }

    memory.set(user, data);

    return data;
}

function getMessages(user) {

    const data = ensureUser(user);

    return data.messages || [];
}

function clearMessages(user) {

    const data = ensureUser(user);

    data.messages = [];

    memory.set(user, data);
}

function setCooldown(user, seconds = 5) {

    const data = ensureUser(user);

    data.cooldown = Date.now() + (seconds * 1000);

    memory.set(user, data);
}

function isCooldown(user) {

    const data = ensureUser(user);

    return Date.now() < data.cooldown;
}

function getCooldown(user) {

    const data = ensureUser(user);

    const remain =
        Math.floor((data.cooldown - Date.now()) / 1000);

    return remain > 0 ? remain : 0;
}

function setLastReply(user, text) {

    const data = ensureUser(user);

    data.lastReply = text;

    memory.set(user, data);
}

function getLastReply(user) {

    const data = ensureUser(user);

    return data.lastReply || null;
}

function getStats(user) {

    const data = ensureUser(user);

    return {
        totalMessages: data.totalMessages,
        lastMessageAt: data.lastMessageAt,
        memorySize: data.messages.length
    };
}

function deleteUser(user) {

    if (memory.has(user)) {
        memory.delete(user);
    }
}

function clearAll() {
    memory.clear();
}

module.exports = {
    addMessage,
    getMessages,
    clearMessages,
    setCooldown,
    isCooldown,
    getCooldown,
    setLastReply,
    getLastReply,
    getStats,
    deleteUser,
    clearAll
};
