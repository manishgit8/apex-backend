require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { initDB } = require("./db/database");
const authRoutes = require("./routes/auth");
const subjectRoutes = require("./routes/subjects");
const conceptRoutes = require("./routes/concepts");
const sessionRoutes = require("./routes/sessions");

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/concepts", conceptRoutes);
app.use("/api/sessions", sessionRoutes);

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// 404 fallback
app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 APEX Tracker API running at http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/api/health\n`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize database:", err);
    process.exit(1);
  });
