const express = require("express");
const bcrypt = require("bcrypt");
const { OAuth2Client } = require("google-auth-library");
const { getUserByEmail, getUserById, insertUser, upsertGoogleUser, updateStreak, updateProfilePic } = require("../db/database");
const { authMiddleware, signToken } = require("../middleware/auth");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// PUT /api/auth/profile-pic
router.put("/profile-pic", authMiddleware, async (req, res) => {
  try {
    const { profile_pic } = req.body;
    if (!profile_pic) return res.status(400).json({ error: "profile_pic is required" });
    await updateProfilePic(req.userId, profile_pic);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/auth/google
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: "credential is required" });

    // Verify the ID token issued by Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const { name, email, picture } = ticket.getPayload();

    const userRow = await upsertGoogleUser(name, email, picture);

    // Streak logic (same as /login)
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const full = await getUserById(userRow.id);
    const lastLogin = full ? full.last_login_date : null;
    let newStreak = (full && full.streak) ? full.streak : 0;

    if (lastLogin === todayStr) {
      // already logged today
    } else if (lastLogin) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,"0")}-${String(yesterday.getDate()).padStart(2,"0")}`;
      newStreak = lastLogin === yStr ? newStreak + 1 : 1;
    } else {
      newStreak = 1;
    }
    await updateStreak(newStreak, todayStr, userRow.id);

    const token = signToken({ id: userRow.id });
    const updatedUser = await getUserById(userRow.id);
    res.json({ token, user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Google authentication failed" });
  }
});

module.exports = router;
