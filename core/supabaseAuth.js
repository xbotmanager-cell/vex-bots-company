// ========================================================
// VEX SYSTEM - SUPABASE AUTH PROVIDER (VEX~ OPTIMIZED)
// Author: Lupin Starnley Jimmoh
// Purpose: Optimized Cloud Session Management for SaaS
// ========================================================

module.exports = async (supabase, userId) => {
    const { proto, BufferJSON, initAuthCreds } = await import("@whiskeysockets/baileys");

    /**
     * Writes session data to Supabase M_sessions table.
     * Uses UPSERT with a composite key logic for SaaS isolation.
     */
    const writeData = async (data, id) => {
        try {
            const json = JSON.stringify(data, BufferJSON.replacer);
            await supabase
                .from("M_sessions")
                .upsert({ 
                    M_user_id: userId, 
                    M_session_id: id, 
                    M_session_data: { payload: json },
                    M_updated_at: new Date()
                }, { onConflict: 'M_user_id, M_session_id' });
        } catch (e) {
            console.error(`[VEX DB] Write Error (${id}):`, e.message);
        }
    };

    /**
     * Reads session data from Supabase.
     */
    const readData = async (id) => {
        try {
            const { data, error } = await supabase
                .from("M_sessions")
                .select("M_session_data")
                .eq("M_user_id", userId)
                .eq("M_session_id", id)
                .maybeSingle();

            if (error || !data || !data.M_session_data) return null;
            return JSON.parse(data.M_session_data.payload, BufferJSON.reviver);
        } catch (e) {
            return null;
        }
    };

    /**
     * Removes session data from Supabase.
     */
    const removeData = async (id) => {
        try {
            await supabase
                .from("M_sessions")
                .delete()
                .eq("M_user_id", userId)
                .eq("M_session_id", id);
        } catch (e) {
            console.error(`[VEX DB] Delete Error (${id}):`, e.message);
        }
    };

    // Initialize credentials from DB or create new ones
    const creds = await readData("creds") || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === "app-state-sync-key" && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const storeId = `${category}-${id}`;
                            tasks.push(value ? writeData(value, storeId) : removeData(storeId));
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: async () => {
            await writeData(creds, "creds");
        }
    };
};
