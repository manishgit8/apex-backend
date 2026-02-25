const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ─── Schema Init ───────────────────────────────────────────────────────────────

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id              SERIAL PRIMARY KEY,
      name            TEXT    NOT NULL,
      email           TEXT    NOT NULL UNIQUE,
      password        TEXT    NOT NULL,
      streak          INTEGER DEFAULT 0,
      last_login_date TEXT    DEFAULT NULL,
      created_at      TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subjects (
      id         SERIAL PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT    NOT NULL,
      color      TEXT    NOT NULL DEFAULT '#E8C547',
      icon       TEXT    NOT NULL DEFAULT '◎',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS concepts (
      id          SERIAL PRIMARY KEY,
      subject_id  INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      name        TEXT    NOT NULL,
      mastery     INTEGER NOT NULL DEFAULT 0 CHECK(mastery BETWEEN 0 AND 100),
      status      TEXT    NOT NULL DEFAULT 'new'
                          CHECK(status IN ('new','learning','struggling','mastered')),
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS study_sessions (
      id          SERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      concept_id  INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      duration    INTEGER NOT NULL DEFAULT 0,
      score       INTEGER NOT NULL DEFAULT 0 CHECK(score BETWEEN 0 AND 100),
      notes       TEXT DEFAULT '',
      studied_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  // Add profile_pic column if it doesn't exist (safe migration)
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_pic TEXT DEFAULT NULL
  `);

  // Allow Google-only users (no password)
  await pool.query(`
    ALTER TABLE users ALTER COLUMN password DROP NOT NULL
  `).catch(() => {}); // ignore if already nullable

  console.log("✅ Database tables ready");
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function masteryToStatus(mastery) {
  if (mastery >= 80) return "mastered";
  if (mastery >= 60) return "learning";
  if (mastery >= 20) return "struggling";
  return "new";
}

async function getUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0] || null;
}

async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, name, email, streak, last_login_date, profile_pic, created_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
}

async function updateProfilePic(userId, profilePic) {
  await pool.query(
    "UPDATE users SET profile_pic = $1 WHERE id = $2",
    [profilePic, userId]
  );
}

async function insertUser(name, email, password) {
  const { rows } = await pool.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id",
    [name, email, password]
  );
  return rows[0];
}

async function upsertGoogleUser(name, email, profilePic) {
  const existing = await getUserByEmail(email);
  if (existing) {
    // Update name/pic in case they changed
    await pool.query(
      "UPDATE users SET name = $1, profile_pic = COALESCE($2, profile_pic) WHERE id = $3",
      [name, profilePic, existing.id]
    );
    return existing;
  }
  const { rows } = await pool.query(
    "INSERT INTO users (name, email, profile_pic) VALUES ($1, $2, $3) RETURNING id",
    [name, email, profilePic]
  );
  return rows[0];
}

async function updateStreak(streak, lastLoginDate, id) {
  await pool.query(
    "UPDATE users SET streak = $1, last_login_date = $2 WHERE id = $3",
    [streak, lastLoginDate, id]
  );
}

async function getSubjectsByUser(userId) {
  const { rows } = await pool.query(
    `SELECT s.*,
            COUNT(c.id) AS concept_count,
            COALESCE(ROUND(AVG(c.mastery)), 0) AS avg_mastery
     FROM subjects s
     LEFT JOIN concepts c ON c.subject_id = s.id
     WHERE s.user_id = $1
     GROUP BY s.id
     ORDER BY s.created_at ASC`,
    [userId]
  );
  return rows;
}

async function getConceptsBySubject(subjectId) {
  const { rows } = await pool.query(
    `SELECT c.*,
            COUNT(ss.id) AS session_count,
            MAX(ss.studied_at) AS last_studied
     FROM concepts c
     LEFT JOIN study_sessions ss ON ss.concept_id = c.id
     WHERE c.subject_id = $1
     GROUP BY c.id
     ORDER BY c.created_at ASC`,
    [subjectId]
  );
  return rows;
}

async function getConceptById(id) {
  const { rows } = await pool.query("SELECT * FROM concepts WHERE id = $1", [id]);
  return rows[0] || null;
}

async function getSessionsByUser(userId) {
  const { rows } = await pool.query(
    `SELECT ss.*, c.name AS concept_name, s.name AS subject_name
     FROM study_sessions ss
     JOIN concepts c ON c.id = ss.concept_id
     JOIN subjects s ON s.id = c.subject_id
     WHERE ss.user_id = $1
     ORDER BY ss.studied_at DESC
     LIMIT 50`,
    [userId]
  );
  return rows;
}

async function getWeeklyActivity(userId) {
  const { rows } = await pool.query(
    `SELECT DATE(studied_at) AS day,
            ROUND(AVG(score)) AS avg_score,
            COUNT(*) AS session_count,
            SUM(duration) AS total_minutes
     FROM study_sessions
     WHERE user_id = $1
       AND studied_at >= NOW() - INTERVAL '6 days'
     GROUP BY DATE(studied_at)
     ORDER BY day ASC`,
    [userId]
  );
  return rows;
}

async function getStats(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(DISTINCT ss.id)                         AS total_sessions,
            COALESCE(SUM(ss.duration), 0)                AS total_minutes,
            COALESCE(ROUND(AVG(ss.score)), 0)            AS avg_score,
            COUNT(DISTINCT ss.concept_id)                 AS concepts_practiced
     FROM study_sessions ss
     WHERE ss.user_id = $1`,
    [userId]
  );
  return rows[0];
}

async function insertSubject(userId, name, color, icon) {
  const { rows } = await pool.query(
    "INSERT INTO subjects (user_id, name, color, icon) VALUES ($1, $2, $3, $4) RETURNING id",
    [userId, name, color, icon]
  );
  return rows[0];
}

async function insertConcept(subjectId, name) {
  const { rows } = await pool.query(
    "INSERT INTO concepts (subject_id, name) VALUES ($1, $2) RETURNING id",
    [subjectId, name]
  );
  return rows[0];
}

async function insertSession(userId, conceptId, duration, score, notes) {
  const { rows } = await pool.query(
    "INSERT INTO study_sessions (user_id, concept_id, duration, score, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [userId, conceptId, duration, score, notes]
  );
  return rows[0];
}

async function updateConceptMastery(mastery, status, id) {
  await pool.query(
    "UPDATE concepts SET mastery = $1, status = $2, updated_at = NOW() WHERE id = $3",
    [mastery, status, id]
  );
}

async function updateSubject(name, color, icon, id, userId) {
  const { rowCount } = await pool.query(
    "UPDATE subjects SET name = $1, color = $2, icon = $3 WHERE id = $4 AND user_id = $5",
    [name, color, icon, id, userId]
  );
  return rowCount;
}

async function deleteConcept(id, userId) {
  const { rowCount } = await pool.query(
    `DELETE FROM concepts WHERE id = $1
     AND subject_id IN (SELECT id FROM subjects WHERE user_id = $2)`,
    [id, userId]
  );
  return rowCount;
}

async function deleteSubject(id, userId) {
  const { rowCount } = await pool.query(
    "DELETE FROM subjects WHERE id = $1 AND user_id = $2",
    [id, userId]
  );
  return rowCount;
}

module.exports = {
  pool,
  initDB,
  masteryToStatus,
  getUserByEmail,
  getUserById,
  insertUser,
  upsertGoogleUser,
  updateStreak,
  updateProfilePic,
  getSubjectsByUser,
  getConceptsBySubject,
  getConceptById,
  getSessionsByUser,
  getWeeklyActivity,
  getStats,
  insertSubject,
  insertConcept,
  insertSession,
  updateConceptMastery,
  updateSubject,
  deleteConcept,
  deleteSubject,
};
