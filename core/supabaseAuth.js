// ========================================================
// VEX SYSTEM - SUPABASE AUTH PROVIDER (SAAS READY)
// Author: Lupin Starnley Jimmoh
// Purpose: Store WhatsApp sessions in Cloud Database instead of local files
// ========================================================

const { proto } = require("@whiskeysockets/baileys");
const { BufferJSON } = require("@whiskeysockets/baileys");

module.exports = async (supabase, userId) => {
    const writeData = async (data, id) => {
        const json = JSON.stringify(data, BufferJSON.replacer);
        await supabase
            .from("M_sessions")
            .upsert({ 
                M_user_id: userId, 
                M_session_id: id, 
                M_session_data: json 
            });
    };

    const readData = async (id) => {
        try {
            const { data, error } = await supabase
                .from("M_sessions")
                .select("M_session_data")
                .eq("M_user_id", userId)
                .eq("M_session_id", id)
                .single();

            if (error || !data) return null;
            return JSON.parse(data.M_session_data, BufferJSON.reviver);
        } catch (e) {
            return null;
        }
    };

    const removeData = async (id) => {
        await supabase
            .from("M_sessions")
            .delete()
            .eq("M_user_id", userId)
            .eq("M_session_id", id);
    };

    // Initial Creds Loading
    const creds = await readData("creds") || { 
        creds: { 
            registrationId: Math.floor(Math.random() * 65535),
            noiseKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
            signedIdentityKey: { public: Buffer.alloc(32), private: Buffer.alloc(32) },
            signedPreKey: { keyPair: { public: Buffer.alloc(32), private: Buffer.alloc(32) }, signature: Buffer.alloc(64), keyId: 1 }
        }
    };

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
