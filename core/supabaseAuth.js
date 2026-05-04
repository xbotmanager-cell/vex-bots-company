// ========================================================
// VEX SYSTEM - SUPABASE AUTH PROVIDER (SAAS READY)
// Author: Lupin Starnley Jimmoh
// Purpose: Store WhatsApp sessions in Cloud Database (M_sessions)
// ========================================================

module.exports = async (supabase, userId) => {
    // --- DYNAMIC IMPORT FOR NODE V22 & BAILEYS PROTO ---
    const { proto, BufferJSON, initAuthCreds } = await import("@whiskeysockets/baileys");

    const writeData = async (data, id) => {
        try {
            const json = JSON.stringify(data, BufferJSON.replacer);
            await supabase
                .from("M_sessions")
                .upsert({ 
                    M_user_id: userId, 
                    M_session_id: id, 
                    M_session_data: json 
                }, { onConflict: 'M_user_id, M_session_id' });
        } catch (e) {
            console.error(`[DB ERROR] Failed to write ${id}:`, e.message);
        }
    };

    const readData = async (id) => {
        try {
            const { data, error } = await supabase
                .from("M_sessions")
                .select("M_session_data")
                .eq("M_user_id", userId)
                .eq("M_session_id", id)
                .maybeSingle();

            if (error || !data) return null;
            return JSON.parse(data.M_session_data, BufferJSON.reviver);
        } catch (e) {
            return null;
        }
    };

    const removeData = async (id) => {
        try {
            await supabase
                .from("M_sessions")
                .delete()
                .eq("M_user_id", userId)
                .eq("M_session_id", id);
        } catch (e) {
            console.error(`[DB ERROR] Failed to remove ${id}:`, e.message);
        }
    };

    // --- FIX: INITIALIZE VALID BAILEYS CREDS ---
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
