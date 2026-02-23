const express = require("express");
const {
  insertConcept,
  updateConceptMastery,
  deleteConcept,
  getConceptById,
  masteryToStatus,
} = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// POST /api/concepts — create concept under a subject
router.post("/", async (req, res) => {
  try {
    const { subject_id, name } = req.body;
    if (!subject_id || !name)
      return res.status(400).json({ error: "subject_id and name are required" });

    const result = await insertConcept(subject_id, name);
    res.status(201).json({
      concept: { id: result.id, subject_id, name, mastery: 0, status: "new" },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PATCH /api/concepts/:id/mastery — update mastery score
router.patch("/:id/mastery", async (req, res) => {
  try {
    const { mastery } = req.body;
    if (mastery === undefined || mastery < 0 || mastery > 100)
      return res.status(400).json({ error: "mastery must be 0–100" });

    const concept = await getConceptById(req.params.id);
    if (!concept) return res.status(404).json({ error: "Concept not found" });

    const status = masteryToStatus(mastery);
    await updateConceptMastery(mastery, status, req.params.id);
    res.json({ id: Number(req.params.id), mastery, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/concepts/:id
router.delete("/:id", async (req, res) => {
  try {
    const rowCount = await deleteConcept(req.params.id, req.userId);
    if (rowCount === 0)
      return res.status(404).json({ error: "Concept not found or not yours" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
