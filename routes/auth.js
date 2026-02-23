const express = require("express");
const bcrypt = require("bcrypt");
const { getUserByEmail, getUserById, insertUser, updateStreak } = require("../db/database");
const { authMiddleware, signToken } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password are required" });

    const existing = await getUserByEmail(email);
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await insertUser(name, email, hashed);
    const token = signToken({ id: user.id });
    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });

    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    // ── Streak logic ──────────────────────────────────────────────
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const lastLogin = user.last_login_date;
    let newStreak = user.streak || 0;

    if (lastLogin === todayStr) {
      // Already logged in today — keep streak
    } else if (lastLogin) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`;
      newStreak = lastLogin === yStr ? newStreak + 1 : 1;
    } else {
      newStreak = 1; // first ever login
    }

    await updateStreak(newStreak, todayStr, user.id);
    // ─────────────────────────────────────────────────────────────

    const token = signToken({ id: user.id });
    const updatedUser = await getUserById(user.id);
    res.json({ token, user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await getUserById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
