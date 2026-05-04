const { createClient } = require("@supabase/supabase-js");
const userService = require("./user.service");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// CREATE PAYMENT (user upload)
async function createPayment({ user_id, amount, method, proof_url }) {
    return await supabase.from("M_payments").insert({
        M_user_id: user_id,
        M_amount_vx: amount,
        M_payment_method: method,
        M_proof_url: proof_url,
        M_status: "pending"
    });
}

// GET PENDING PAYMENTS
async function getPendingPayments() {
    const { data } = await supabase
        .from("M_payments")
        .select("*")
        .eq("M_status", "pending");

    return data || [];
}

// APPROVE PAYMENT
async function approvePayment(tx_id) {
    const { data: payment } = await supabase
        .from("M_payments")
        .select("*")
        .eq("M_tx_id", tx_id)
        .single();

    if (!payment) return;

    // update payment
    await supabase
        .from("M_payments")
        .update({ M_status: "approved" })
        .eq("M_tx_id", tx_id);

    // add VX
    await userService.addVX(payment.M_user_id, payment.M_amount_vx);

    return true;
}

// REJECT PAYMENT
async function rejectPayment(tx_id) {
    return await supabase
        .from("M_payments")
        .update({ M_status: "rejected" })
        .eq("M_tx_id", tx_id);
}

module.exports = {
    createPayment,
    getPendingPayments,
    approvePayment,
    rejectPayment
};
