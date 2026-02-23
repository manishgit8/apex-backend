const express = require("express");
const {
  getSubjectsByUser,
  getConceptsBySubject,
  insertSubject,
  updateSubject,
  deleteSubject,
} = require("../db/database");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();
router.use(authMiddleware);

// GET /api/subjects — list all subjects (with concept counts)
router.get("/", async (req, res) => {
  try {
    const subjects = await getSubjectsByUser(req.userId);
    res.json({ subjects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// GET /api/subjects/:id/concepts
router.get("/:id/concepts", async (req, res) => {
  try {
    const concepts = await getConceptsBySubject(req.params.id);
    res.json({ concepts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /api/subjects
router.post("/", async (req, res) => {
  try {
    const { name, color = "#E8C547", icon = "◎" } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const result = await insertSubject(req.userId, name, color, icon);
    res.status(201).json({
      subject: { id: result.id, user_id: req.userId, name, color, icon },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// PUT /api/subjects/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, color, icon } = req.body;
    const rowCount = await updateSubject(name, color, icon, req.params.id, req.userId);
    if (rowCount === 0)
      return res.status(404).json({ error: "Subject not found or not yours" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/subjects/:id
router.delete("/:id", async (req, res) => {
  try {
    const rowCount = await deleteSubject(req.params.id, req.userId);
    if (rowCount === 0)
      return res.status(404).json({ error: "Subject not found or not yours" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
