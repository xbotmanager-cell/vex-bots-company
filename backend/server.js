/**
 * VEX DASHBOARD BACKEND CORE
 * Express Server + Socket.io + API Router
 * This file is STABLE — no future edits required
 */

require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");

const { Server } = require("socket.io");

// ================= INIT =================

const app = express();
const server = http.createServer(app);

// ================= SOCKET.IO =================

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// make io globally accessible
global.io = io;

// ================= MIDDLEWARE =================

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// ================= HEALTH CHECK =================

app.get("/", (req, res) => {
    res.json({
        status: "VEX BACKEND ONLINE",
        uptime: process.uptime(),
        timestamp: new Date()
    });
});

// ================= ROUTES =================

// Lazy load (prevents crash if route not yet created)

try {
    app.use("/api/auth", require("./routes/auth.routes"));
} catch {}

try {
    app.use("/api/sessions", require("./routes/session.routes"));
} catch {}

try {
    app.use("/api/settings", require("./routes/settings.routes"));
} catch {}

try {
    app.use("/api/pair", require("./routes/pair.routes"));
} catch {}

// ================= SOCKET EVENTS =================

io.on("connection", (socket) => {
    console.log("🟢 Dashboard Connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("🔴 Dashboard Disconnected:", socket.id);
    });
});

// ================= GLOBAL ERROR HANDLER =================

app.use((err, req, res, next) => {
    console.error("🔥 API ERROR:", err.message);

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
});

// ================= START SERVER =================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 VEX BACKEND RUNNING ON PORT ${PORT}`);
});

// ================= EXPORT =================

module.exports = { app, server, io };
