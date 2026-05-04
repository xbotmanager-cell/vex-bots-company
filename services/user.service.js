const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// GET USER
async function getUser(user_id) {
    const { data, error } = await supabase
        .from("M_users")
        .select("*")
        .eq("M_user_id", user_id)
        .single();

    if (error) return null;
    return data;
}

// ADD VX
async function addVX(user_id, amount) {
    const { data: user } = await supabase
        .from("M_users")
        .select("M_vx_balance")
        .eq("M_user_id", user_id)
        .single();

    const newBalance = (user?.M_vx_balance || 0) + amount;

    return await supabase
        .from("M_users")
        .update({
            M_vx_balance: newBalance,
            M_account_status: "active"
        })
        .eq("M_user_id", user_id);
}

// DEDUCT VX
async function deductVX(user_id, amount) {
    const { data: user } = await supabase
        .from("M_users")
        .select("M_vx_balance")
        .eq("M_user_id", user_id)
        .single();

    const newBalance = Math.max(0, (user?.M_vx_balance || 0) - amount);

    return await supabase
        .from("M_users")
        .update({
            M_vx_balance: newBalance
        })
        .eq("M_user_id", user_id);
}

// BAN USER
async function banUser(user_id) {
    return await supabase
        .from("M_users")
        .update({
            M_account_status: "banned"
        })
        .eq("M_user_id", user_id);
}

// EXPIRE USER
async function expireUser(user_id) {
    return await supabase
        .from("M_users")
        .update({
            M_account_status: "expired"
        })
        .eq("M_user_id", user_id);
}

module.exports = {
    getUser,
    addVX,
    deductVX,
    banUser,
    expireUser
};
