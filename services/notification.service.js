const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// SEND PAYMENT ALERT
async function sendPaymentAlert({ email, amount, method, proof }) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.ADMIN_EMAIL,
        subject: "New Payment Request",
        html: `
            <h2>New Payment</h2>
            <p><b>User:</b> ${email}</p>
            <p><b>Amount:</b> ${amount} VX</p>
            <p><b>Method:</b> ${method}</p>
            <p><b>Proof:</b> <a href="${proof}">View Screenshot</a></p>
        `
    };

    return transporter.sendMail(mailOptions);
}

module.exports = {
    sendPaymentAlert
};
