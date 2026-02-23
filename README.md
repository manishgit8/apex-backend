# ◈ APEX Mastery Tracker — Full Stack Setup

## Stack
- **Frontend**: React (Vite)
- **Backend**: Node.js + Express
- **Database**: SQLite (via `better-sqlite3`)
- **Auth**: JWT (7-day tokens) + bcrypt password hashing

---

## Project Structure

```
apex-tracker/
├── backend/
│   ├── db/
│   │   └── database.js       ← SQLite schema + prepared statements
│   ├── middleware/
│   │   └── auth.js           ← JWT sign/verify middleware
│   ├── routes/
│   │   ├── auth.js           ← POST /register, POST /login, GET /me
│   │   ├── subjects.js       ← CRUD for subjects
│   │   ├── concepts.js       ← CRUD for concepts + mastery update
│   │   └── sessions.js       ← Log sessions, weekly activity, stats
│   ├── server.js             ← Express app entry point
│   └── package.json
└── frontend/
    ├── App.jsx               ← Full React UI (connected to API)
    └── api.js                ← All fetch() calls to backend
```

---

## Backend Setup

```bash
cd backend
npm install
node server.js
# API running at http://localhost:4000
```

The SQLite database (`apex.db`) is auto-created on first run.

### Environment Variables (optional)
Create a `.env` file in `backend/`:
```
PORT=4000
JWT_SECRET=your_super_secret_key_here
```

---

## Frontend Setup

Use with **Vite + React**:

```bash
# From your Vite project root:
npm install
cp path/to/App.jsx src/App.jsx
cp path/to/api.js src/api.js
npm run dev
# Frontend at http://localhost:5173
```

Or create a new Vite project:
```bash
npm create vite@latest apex-frontend -- --template react
cd apex-frontend
npm install
# Replace src/App.jsx and add src/api.js
npm run dev
```

---

## API Reference

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | `{name, email, password}` | Create account |
| POST | `/api/auth/login` | `{email, password}` | Login, returns JWT |
| GET | `/api/auth/me` | — | Get current user |

### Subjects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/subjects` | List all subjects with concept counts |
| POST | `/api/subjects` | Create subject `{name, color, icon}` |
| PUT | `/api/subjects/:id` | Update subject |
| DELETE | `/api/subjects/:id` | Delete subject + all its concepts |
| GET | `/api/subjects/:id/concepts` | List concepts for a subject |

### Concepts
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/concepts` | Create concept `{subject_id, name}` |
| PATCH | `/api/concepts/:id/mastery` | Update mastery `{mastery: 0-100}` |
| DELETE | `/api/concepts/:id` | Delete concept |

### Sessions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sessions` | Recent 50 sessions |
| GET | `/api/sessions/weekly` | Last 7 days activity |
| GET | `/api/sessions/stats` | Totals: hours, sessions, avg score |
| POST | `/api/sessions` | Log session `{concept_id, score, duration?, notes?}` |

---

## How Mastery Is Calculated

When you log a study session with a score:

```
new_mastery = round(old_mastery × 0.7 + score × 0.3)
```

Status is auto-assigned:
- `mastered` → ≥ 80%
- `learning` → ≥ 60%
- `struggling` → ≥ 20%
- `new` → < 20%

---

## Database Schema

```sql
users          (id, name, email, password, streak, created_at)
subjects       (id, user_id, name, color, icon, created_at)
concepts       (id, subject_id, name, mastery, status, created_at, updated_at)
study_sessions (id, user_id, concept_id, duration, score, notes, studied_at)
```
