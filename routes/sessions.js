const express = require("express");
const {
  insertSession,
  getSessionsByUser,
  getWeeklyActivity,
  getConceptById,
  updateConceptMastery,
  masteryToStatus,
  getStats,
} = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/sessions — recent sessions
router.get("/", async (req, res) => {
  try {
    const sessions = await getSessionsByUser(req.userId);
    res.json({ sessions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/weekly — activity for past 7 days
router.get("/weekly", async (req, res) => {
  try {
    const data = await getWeeklyActivity(req.userId);
    res.json({ weekly: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/sessions/stats — overall stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await getStats(req.userId);
    res.json({ stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/sessions — log a study session
router.post("/", async (req, res) => {
  try {
    const { concept_id, duration = 30, score, notes = "" } = req.body;
    if (!concept_id || score === undefined)
      return res.status(400).json({ error: "concept_id and score are required" });
    if (score < 0 || score > 100)
      return res.status(400).json({ error: "score must be 0–100" });

    const concept = await getConceptById(concept_id);
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    // Weighted rolling average: new mastery = 70% old + 30% new score
    const newMastery = Math.round(concept.mastery * 0.7 + score * 0.3);
    const newStatus = masteryToStatus(newMastery);

    const session = await insertSession(req.userId, concept_id, duration, score, notes);
    await updateConceptMastery(newMastery, newStatus, concept_id);

    res.status(201).json({
      session: { id: session.id, concept_id, duration, score, notes },
      concept: { id: concept_id, mastery: newMastery, status: newStatus },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
