const { createClient } = require("@supabase/supabase-js");
const sessionManager = require("../core/sessionManager");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// ================= MAIN WORKER =================

async function startExpiryWorker() {
    console.log("⏳ EXPIRY WORKER STARTED...");

    setInterval(async () => {
        try {
            const now = new Date().toISOString();

            // ================= FETCH EXPIRED SESSIONS =================

            const { data: expiredSessions } = await supabase
                .from("bot_sessions")
                .select("*")
                .lt("expires_at", now)
                .eq("status", "active");

            if (!expiredSessions || expiredSessions.length === 0) return;

            for (const session of expiredSessions) {

                console.log(`⛔ Expiring session: ${session.id}`);

                // ================= KILL SESSION =================

                try {
                    await sessionManager.killSession(session.id);
                } catch (e) {
                    console.log("Kill error:", e.message);
                }

                // ================= UPDATE DB =================

                await supabase
                    .from("bot_sessions")
                    .update({
                        status: "expired"
                    })
                    .eq("id", session.id);

                // ================= OPTIONAL NOTIFICATION =================

                if (session.owner) {
                    notifyOwner(session.owner, session.phone);
                }
            }

        } catch (err) {
            console.error("EXPIRY WORKER ERROR:", err.message);
        }

    }, 5 * 60 * 1000); // every 5 minutes
}

// ================= NOTIFICATION =================

async function notifyOwner(owner, phone) {
    try {
        console.log(`📢 Notifying owner ${owner} about expired session ${phone}`);

        // Optional future upgrade:
        // send WhatsApp message / DB notification / email

    } catch (e) {
        console.log("Notify error:", e.message);
    }
}

module.exports = startExpiryWorker;
