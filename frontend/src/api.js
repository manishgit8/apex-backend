// api.js — all fetch calls to the backend

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000") + "/api";

function getToken() {
  return localStorage.getItem("apex_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status}: ${data.error || "Request failed"}`);
  return data;
}

// ─── Auth ──────────────────────────────────────────────────────────────────────
export const register = (name, email, password) =>
  request("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });

export const login = (email, password) =>
  request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const getMe = () => request("/auth/me");

// ─── Subjects ─────────────────────────────────────────────────────────────────
export const getSubjects = () => request("/subjects");
export const getConcepts = (subjectId) => request(`/subjects/${subjectId}/concepts`);
export const createSubject = (name, color, icon) =>
  request("/subjects", { method: "POST", body: JSON.stringify({ name, color, icon }) });
export const deleteSubject = (id) => request(`/subjects/${id}`, { method: "DELETE" });

// ─── Concepts ─────────────────────────────────────────────────────────────────
export const createConcept = (subject_id, name) =>
  request("/concepts", { method: "POST", body: JSON.stringify({ subject_id, name }) });
export const updateMastery = (id, mastery) =>
  request(`/concepts/${id}/mastery`, { method: "PATCH", body: JSON.stringify({ mastery }) });
export const deleteConcept = (id) => request(`/concepts/${id}`, { method: "DELETE" });

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const getSessions = () => request("/sessions");
export const getWeekly = () => request("/sessions/weekly");
export const getStats = () => request("/sessions/stats");
export const logSession = (concept_id, score, duration = 30, notes = "") =>
  request("/sessions", { method: "POST", body: JSON.stringify({ concept_id, score, duration, notes }) });
