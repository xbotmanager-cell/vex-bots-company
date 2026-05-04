const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// CREATE SESSION
async function createSession(user_id, phone) {
    return await supabase.from("M_sessions").insert({
        M_user_id: user_id,
        M_phone_number: phone,
        M_pairing_status: "pairing"
    });
}

// UPDATE SESSION DATA
async function saveSession(user_id, sessionData) {
    return await supabase
        .from("M_sessions")
        .update({
            M_session_data: sessionData,
            M_pairing_status: "connected"
        })
        .eq("M_user_id", user_id);
}

// GET ACTIVE SESSIONS
async function getActiveSessions() {
    const { data } = await supabase
        .from("M_sessions")
        .select("*")
        .eq("M_pairing_status", "connected");

    return data || [];
}

// DELETE SESSION
async function deleteSession(user_id) {
    return await supabase
        .from("M_sessions")
        .delete()
        .eq("M_user_id", user_id);
}

module.exports = {
    createSession,
    saveSession,
    getActiveSessions,
    deleteSession
};
