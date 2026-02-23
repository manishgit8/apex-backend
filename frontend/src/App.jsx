// App.jsx — APEX Mastery Tracker (full backend-connected version)
import { useState, useEffect, useCallback } from "react";
import * as api from "./api";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  mastered:   { label: "Mastered",   bg: "#0D2818", text: "#4ADE80", dot: "#4ADE80" },
  learning:   { label: "Learning",   bg: "#1A1A0D", text: "#E8C547", dot: "#E8C547" },
  struggling: { label: "Needs Work", bg: "#200D0D", text: "#FF6B6B", dot: "#FF6B6B" },
  new:        { label: "New",        bg: "#0D0D20", text: "#818CF8", dot: "#818CF8" },
};

const SUBJECT_COLORS = ["#E8C547","#4ECDC4","#FF6B6B","#818CF8","#FB923C","#34D399"];
const SUBJECT_ICONS  = ["</>","{}","[]","#!",">>","0x","*/","=="];
const WEEK_LABELS    = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function masteryColor(m) {
  if (m >= 80) return "#4ADE80";
  if (m >= 60) return "#E8C547";
  if (m >= 40) return "#FB923C";
  return "#FF6B6B";
}

// ─── Overall Performance Dashboard ──────────────────────────────────────────
function OverallDashboard({ subjects, conceptsMap, stats, weekly, user }) {
  const allConcepts = Object.values(conceptsMap).flat();
  const masteredCount  = allConcepts.filter(c => c.status === "mastered").length;
  const learningCount  = allConcepts.filter(c => c.status === "learning").length;
  const strugglingCount= allConcepts.filter(c => c.status === "struggling").length;
  const newCount       = allConcepts.filter(c => c.status === "new").length;
  const avgMastery     = allConcepts.length ? Math.round(allConcepts.reduce((a,c) => a + c.mastery, 0) / allConcepts.length) : 0;
  const studyHours     = stats ? (stats.total_minutes / 60).toFixed(1) : "0.0";
  const totalSessions  = stats?.total_sessions ?? 0;

  const todayIdx = new Date().getDay();
  const chartData = Array(7).fill(0);
  weekly.forEach(row => {
    const d = new Date(row.day + "T12:00:00");
    const dayIdx = (d.getDay() + 6) % 7;
    chartData[dayIdx] = row.avg_score || 0;
  });

  const topConcepts  = [...allConcepts].sort((a,b) => b.mastery - a.mastery).slice(0,5);
  const weakConcepts = [...allConcepts].filter(c => c.mastery < 60).sort((a,b) => a.mastery - b.mastery).slice(0,5);

  const statCards = [
    { label: "TOTAL SUBJECTS",  value: subjects.length,      color: "#818CF8" },
    { label: "TOTAL CONCEPTS",  value: allConcepts.length,   color: "#E8C547" },
    { label: "MASTERED",        value: masteredCount,         color: "#4ADE80" },
    { label: "AVG. MASTERY",    value: `${avgMastery}%`,      color: masteryColor(avgMastery) },
    { label: "STUDY HOURS",     value: `${studyHours}h`,      color: "#4ECDC4" },
    { label: "TOTAL SESSIONS",  value: totalSessions,         color: "#FB923C" },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"18px" }}>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px" }}>
        {statCards.map((s,i) => (
          <div key={i} style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"16px 18px" }}>
            <div style={{ fontSize:"9px", letterSpacing:"2px", color:"rgba(255,255,255,0.3)", marginBottom:"8px" }}>{s.label}</div>
            <div style={{ fontSize:"26px", fontWeight:700, fontFamily:"monospace", color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Status breakdown */}
      <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"16px 18px" }}>
        <div style={{ fontSize:"10px", letterSpacing:"2px", color:"rgba(255,255,255,0.4)", marginBottom:"14px" }}>STATUS BREAKDOWN</div>
        {[
          { label:"Mastered", count:masteredCount,   color:"#4ADE80" },
          { label:"Learning", count:learningCount,   color:"#E8C547" },
          { label:"Needs Work",count:strugglingCount,color:"#FF6B6B" },
          { label:"New",      count:newCount,        color:"#818CF8" },
        ].map(row => (
          <div key={row.label} style={{ marginBottom:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
              <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.6)" }}>{row.label}</span>
              <span style={{ fontSize:"11px", color:row.color, fontWeight:700 }}>{row.count}</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"4px", height:"6px" }}>
              <div style={{ height:"6px", borderRadius:"4px", background:row.color, width: allConcepts.length ? `${(row.count/allConcepts.length)*100}%` : "0%", transition:"width 0.4s" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Per-subject mastery */}
      <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"16px 18px" }}>
        <div style={{ fontSize:"10px", letterSpacing:"2px", color:"rgba(255,255,255,0.4)", marginBottom:"14px" }}>PER-SUBJECT MASTERY</div>
        {subjects.length === 0 && <div style={{ color:"rgba(255,255,255,0.2)", fontSize:"12px" }}>No subjects yet.</div>}
        {subjects.map(sub => {
          const concepts = conceptsMap[sub.id] || [];
          const avg = concepts.length ? Math.round(concepts.reduce((a,c) => a+c.mastery,0)/concepts.length) : 0;
          return (
            <div key={sub.id} style={{ marginBottom:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"5px" }}>
                <span style={{ fontSize:"12px", color:sub.color, fontWeight:700 }}>{sub.icon} {sub.name}</span>
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.4)" }}>{concepts.length} concepts · {avg}%</span>
              </div>
              <div style={{ background:"rgba(255,255,255,0.05)", borderRadius:"4px", height:"7px" }}>
                <div style={{ height:"7px", borderRadius:"4px", background:sub.color, width:`${avg}%`, transition:"width 0.4s" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly activity chart */}
      <div style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"16px 18px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
          <span style={{ fontSize:"10px", letterSpacing:"2px", color:"rgba(255,255,255,0.4)" }}>WEEKLY ACTIVITY</span>
          <span style={{ fontSize:"10px", color:"rgba(255,255,255,0.25)" }}>avg score</span>
        </div>
        <div style={{ display:"flex", gap:"6px", height:"80px", alignItems:"flex-end" }}>
          {chartData.map((val, i) => (
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"4px" }}>
              <div style={{ width:"100%", background: i === (new Date().getDay()+6)%7 ? "linear-gradient(to top,#E8C547,#4ECDC4)" : "rgba(255,255,255,0.08)", borderRadius:"3px 3px 0 0", height:`${Math.max(val||4, 4)}%`, minHeight:"4px", transition:"height 0.3s" }} />
              <span style={{ fontSize:"9px", color:"rgba(255,255,255,0.3)" }}>{WEEK_LABELS[i].slice(0,1)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top & Weak concepts side by side */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
        {[
          { title:"🏆 TOP CONCEPTS",    list: topConcepts,  colorFn: c => masteryColor(c.mastery) },
          { title:"⚠ NEEDS ATTENTION",  list: weakConcepts, colorFn: () => "#FF6B6B" },
        ].map(panel => (
          <div key={panel.title} style={{ background:"#141414", border:"1px solid rgba(255,255,255,0.06)", borderRadius:"10px", padding:"16px 18px" }}>
            <div style={{ fontSize:"10px", letterSpacing:"2px", color:"rgba(255,255,255,0.4)", marginBottom:"12px" }}>{panel.title}</div>
            {panel.list.length === 0 && <div style={{ color:"rgba(255,255,255,0.2)", fontSize:"12px" }}>None yet.</div>}
            {panel.list.map(c => (
              <div key={c.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <span style={{ fontSize:"11px", color:"rgba(255,255,255,0.7)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.name}</span>
                <span style={{ fontSize:"11px", fontWeight:700, color:panel.colorFn(c), marginLeft:"8px" }}>{c.mastery}%</span>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────
function MiniCalendar() {
  const today = new Date();
  const [current, setCurrent] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const year  = current.getFullYear();
  const month = current.getMonth();
  const monthName = current.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = d => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}>‹</button>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "#E8E8E8", letterSpacing: "1px", textTransform: "uppercase" }}>{monthName}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "16px", padding: "2px 6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", marginBottom: "4px" }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: "9px", color: "rgba(255,255,255,0.25)", padding: "2px 0" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
        {cells.map((d, i) => (
          <div key={i} style={{
            textAlign: "center", fontSize: "10px", padding: "5px 2px", borderRadius: "6px", cursor: d ? "pointer" : "default",
            background: d && isToday(d) ? "#E8C547" : "transparent",
            color: d && isToday(d) ? "#000" : d ? "rgba(255,255,255,0.7)" : "transparent",
            fontWeight: d && isToday(d) ? 700 : 400,
          }}>{d || ""}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Panel ─────────────────────────────────────────────────────────
function SettingsPanel({ user, profilePic, onProfileUpload, onLogout, theme, onThemeChange, accent, onAccentChange, appFont, onFontChange, streakVisible, onStreakToggle }) {
  const [accentColor, setAccentColor] = useState(accent || "#E8C547");
  const [font, setFont]               = useState(appFont || "DM Mono");
  const [showStreak, setShowStreak]   = useState(streakVisible !== false);

  const saveAccent = (c) => { setAccentColor(c); localStorage.setItem("apex_accent", c); onAccentChange?.(c); };
  const saveFont   = (f) => { setFont(f);         localStorage.setItem("apex_font",   f); onFontChange?.(f); };
  const saveStreak = (v) => { setShowStreak(v);   localStorage.setItem("apex_show_streak", String(v)); onStreakToggle?.(v); };

  const isLight = theme === "light";
  const cardBg  = isLight ? "#fff"  : "#111";
  const cardBdr = isLight ? "1px solid rgba(0,0,0,0.08)" : "1px solid rgba(255,255,255,0.07)";
  const txtMain = isLight ? "#1A1A1A" : "#E8E8E8";
  const txtSub  = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.35)";
  const txtHead = isLight ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.3)";
  const divClr  = isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.06)";
  const rowBdr  = isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.05)";
  const selBg   = isLight ? "#F5F5F0"           : "#1A1A1A";
  const selClr  = isLight ? "#1A1A1A"           : "#E8E8E8";
  const selBdr  = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.1)";
  const togOff  = isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)";
  const togKnob = isLight ? "#fff" : "#fff";

  const sectionTitle = (t) => (
    <div style={{ fontSize:"10px", fontWeight:700, letterSpacing:"2px", color:txtHead, textTransform:"uppercase", marginBottom:"14px", borderBottom:`1px solid ${divClr}`, paddingBottom:"8px" }}>{t}</div>
  );
  const row = (label, desc, control) => (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 0", borderBottom:`1px solid ${rowBdr}` }}>
      <div>
        <div style={{ fontSize:"13px", color:txtMain, fontWeight:600 }}>{label}</div>
        {desc && <div style={{ fontSize:"11px", color:txtSub, marginTop:"2px" }}>{desc}</div>}
      </div>
      {control}
    </div>
  );

  const toggle = (val, onChange) => (
    <div onClick={() => onChange(!val)} style={{ width:"40px", height:"22px", borderRadius:"11px", background: val ? "#E8C547" : togOff, cursor:"pointer", position:"relative", transition:"background 0.2s", flexShrink:0 }}>
      <div style={{ position:"absolute", top:"3px", left: val ? "21px" : "3px", width:"16px", height:"16px", borderRadius:"50%", background:togKnob, transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.2)" }} />
    </div>
  );

  const accentOptions = ["#E8C547","#4ECDC4","#818CF8","#FB923C","#4ADE80","#FF6B6B"];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"24px", maxWidth:"680px" }}>

      {/* Profile section */}
      <div style={{ background:cardBg, border:cardBdr, borderRadius:"14px", padding:"24px" }}>
        {sectionTitle("Profile")}
        <div style={{ display:"flex", alignItems:"center", gap:"20px", marginBottom:"20px" }}>
          <div style={{ position:"relative" }}>
            <div style={{ width:"72px", height:"72px", borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(232,197,71,0.4)", background:"linear-gradient(135deg,#E8C547,#818CF8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", fontWeight:700, color:"#000" }}>
              {profilePic ? <img src={profilePic} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : user?.name?.slice(0,2).toUpperCase()}
            </div>
            <label htmlFor="settings-profile-upload" style={{ position:"absolute", bottom:0, right:0, width:"22px", height:"22px", borderRadius:"50%", background:"#E8C547", display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:"11px" }}>✏</label>
            <input type="file" accept="image/*" id="settings-profile-upload" style={{ display:"none" }} onChange={onProfileUpload} />
          </div>
          <div>
            <div style={{ fontSize:"18px", fontWeight:700, color:txtMain }}>{user?.name}</div>
            <div style={{ fontSize:"12px", color:txtSub, marginTop:"2px" }}>{user?.email}</div>
            <div style={{ fontSize:"11px", color:"#E8C547", marginTop:"4px" }}>🔥 {user?.streak ?? 0} day streak</div>
          </div>
        </div>
        {row("Change Photo", "Upload a new profile picture",
          <label htmlFor="settings-profile-upload" style={{ padding:"6px 16px", background:"rgba(232,197,71,0.1)", border:"1px solid rgba(232,197,71,0.3)", borderRadius:"8px", color:"#E8C547", fontSize:"11px", fontWeight:700, cursor:"pointer", letterSpacing:"1px" }}>UPLOAD</label>
        )}
      </div>

      {/* Appearance section */}
      <div style={{ background:cardBg, border:cardBdr, borderRadius:"14px", padding:"24px" }}>
        {sectionTitle("Appearance")}
        {row("Accent Color", "Used for highlights, buttons and active states",
          <div style={{ display:"flex", gap:"8px" }}>
            {accentOptions.map(c => (
              <div key={c} onClick={() => saveAccent(c)} style={{ width:"22px", height:"22px", borderRadius:"50%", background:c, cursor:"pointer", border: accentColor===c ? "2px solid #fff" : "2px solid transparent", boxShadow: accentColor===c ? `0 0 0 3px ${c}55` : "none", transition:"box-shadow 0.15s" }} />
            ))}
          </div>
        )}
        {row("Font", "Interface monospace font",
          <select value={font} onChange={e => saveFont(e.target.value)} style={{ background:selBg, border:`1px solid ${selBdr}`, borderRadius:"6px", color:selClr, fontSize:"12px", padding:"5px 10px", cursor:"pointer", outline:"none" }}>
            <option value="DM Mono">DM Mono</option>
            <option value="Courier New">Courier New</option>
            <option value="Fira Code">Fira Code</option>
            <option value="JetBrains Mono">JetBrains Mono</option>
          </select>
        )}
      </div>

      {/* Preferences section */}
      <div style={{ background:cardBg, border:cardBdr, borderRadius:"14px", padding:"24px" }}>
        {sectionTitle("Preferences")}
        {row("Theme", "Switch between dark and light mode",
          <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
            <span style={{ fontSize:"11px", color:txtSub }}>🌙 Dark</span>
            {toggle(isLight, (v) => onThemeChange(v ? "light" : "dark"))}
            <span style={{ fontSize:"11px", color:txtSub }}>☀️ Light</span>
          </div>
        )}
        {row("Show Streak", "Display streak counter in the sidebar", toggle(showStreak, saveStreak))}
      </div>

      {/* Account section */}
      <div style={{ background:cardBg, border:cardBdr, borderRadius:"14px", padding:"24px" }}>
        {sectionTitle("Account")}
        {row("Signed in as", user?.email,
          <div style={{ fontSize:"11px", color:txtSub }}>JWT Auth</div>
        )}
        {row("Sign Out", "Log out of your account",
          <button onClick={onLogout} style={{ padding:"6px 16px", background:"rgba(255,107,107,0.1)", border:"1px solid rgba(255,107,107,0.3)", borderRadius:"8px", color:"#FF6B6B", fontSize:"11px", fontWeight:700, cursor:"pointer", letterSpacing:"1px" }}>LOG OUT</button>
        )}
      </div>

    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode]         = useState("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const result =
        mode === "login"
          ? await api.login(email, password)
          : await api.register(name, email, password);
      localStorage.setItem("apex_token", result.token);
      // fetch fresh user data (with updated streak) after login/register
      const me = await api.getMe();
      onAuth(me);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const features = [
    { icon: "✏️", label: "Writing Assistant" },
    { icon: "📋", label: "Lesson Planner" },
    { icon: "🎓", label: "Concept Explainer" },
    { icon: "🎯", label: "Activity Generator" },
    { icon: "✨", label: "Creative Resources" },
    { icon: "❓", label: "Quiz Generator" },
    { icon: "T", label: "Text Analyzer" },
    { icon: "🔤", label: "Text Translator" },
    { icon: "▶", label: "YouTube Tools" },
  ];

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:"#f0f2f5", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI', sans-serif" }}>
      <div style={{ display:"flex", width:"900px", minHeight:"560px", background:"#fff", borderRadius:"20px", overflow:"hidden", boxShadow:"0 8px 40px rgba(0,0,0,0.12)" }}>

        {/* ── Left: Form Panel ── */}
        <div style={{ flex:1, padding:"52px 48px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <p style={{ color:"#6c47ff", fontWeight:600, fontSize:"13px", marginBottom:"6px", letterSpacing:"0.3px" }}>Academic Mastery</p>
          <h1 style={{ fontSize:"28px", fontWeight:700, color:"#111", margin:"0 0 6px" }}>
            {mode === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p style={{ color:"#888", fontSize:"13.5px", marginBottom:"28px" }}>
            {mode === "login" ? "Sign in to continue tracking concepts and progress." : "Get started with your mastery journey."}
          </p>

          {/* Google Button */}
          <button style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"10px", border:"1.5px solid #e0e0e0", borderRadius:"10px", padding:"11px", background:"#fff", cursor:"pointer", fontSize:"14px", fontWeight:500, color:"#333", marginBottom:"20px" }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.1 0 5.7 1.1 7.7 2.9l5.7-5.7C33.9 3.5 29.3 1.5 24 1.5 14.8 1.5 7 7.4 3.7 15.5l6.7 5.2C12.1 14 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.4c-.5 2.8-2.1 5.1-4.5 6.7l7 5.4c4.1-3.8 6.5-9.4 6.5-16.1z"/><path fill="#FBBC05" d="M10.4 28.3A14.6 14.6 0 0 1 9.5 24c0-1.5.3-2.9.7-4.3l-6.7-5.2A22.5 22.5 0 0 0 1.5 24c0 3.6.9 7 2.4 10l6.5-5.7z"/><path fill="#34A853" d="M24 46.5c5.3 0 9.8-1.8 13.1-4.8l-7-5.4c-1.8 1.2-4.1 1.9-6.1 1.9-6.4 0-11.9-4.5-13.8-10.5l-6.5 5.7C7 40.6 14.8 46.5 24 46.5z"/></svg>
            Continue with Google
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"20px" }}>
            <div style={{ flex:1, height:"1px", background:"#e8e8e8" }} />
            <span style={{ fontSize:"12px", color:"#aaa", fontWeight:500 }}>OR</span>
            <div style={{ flex:1, height:"1px", background:"#e8e8e8" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            {mode === "register" && (
              <div>
                <label style={{ fontSize:"13px", fontWeight:600, color:"#333", display:"block", marginBottom:"6px" }}>Full Name</label>
                <div style={{ position:"relative" }}>
                  <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"#bbb", fontSize:"15px" }}>👤</span>
                  <input type="text" placeholder="Jane Doe" value={name} onChange={e => setName(e.target.value)} required
                    style={{ width:"100%", border:"1.5px solid #e0e0e0", borderRadius:"10px", padding:"11px 12px 11px 36px", fontSize:"14px", outline:"none", boxSizing:"border-box", color:"#333" }} />
                </div>
              </div>
            )}
            <div>
              <label style={{ fontSize:"13px", fontWeight:600, color:"#333", display:"block", marginBottom:"6px" }}>Email</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"#bbb", fontSize:"14px" }}>✉</span>
                <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ width:"100%", border:"1.5px solid #e0e0e0", borderRadius:"10px", padding:"11px 12px 11px 36px", fontSize:"14px", outline:"none", boxSizing:"border-box", color:"#333" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:"13px", fontWeight:600, color:"#333", display:"block", marginBottom:"6px" }}>Password</label>
              <div style={{ position:"relative" }}>
                <span style={{ position:"absolute", left:"12px", top:"50%", transform:"translateY(-50%)", color:"#bbb", fontSize:"15px" }}>🔒</span>
                <input type={showPass ? "text" : "password"} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} required
                  style={{ width:"100%", border:"1.5px solid #e0e0e0", borderRadius:"10px", padding:"11px 40px 11px 36px", fontSize:"14px", outline:"none", boxSizing:"border-box", color:"#333" }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:"absolute", right:"12px", top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#bbb", fontSize:"16px", padding:0 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {mode === "login" && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"7px", fontSize:"13px", color:"#555", cursor:"pointer" }}>
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                    style={{ accentColor:"#6c47ff", width:"15px", height:"15px" }} />
                  Remember me
                </label>
                <span style={{ fontSize:"13px", color:"#6c47ff", fontWeight:600, cursor:"pointer" }}>Forgot password?</span>
              </div>
            )}

            {error && <div style={{ background:"#fff0f0", border:"1px solid #fcc", borderRadius:"8px", padding:"10px 12px", color:"#c00", fontSize:"13px" }}>{error}</div>}

            <button type="submit" disabled={loading}
              style={{ background:"linear-gradient(135deg,#7c3aed,#6c47ff)", color:"#fff", border:"none", borderRadius:"10px", padding:"13px", fontSize:"15px", fontWeight:700, cursor:loading?"not-allowed":"pointer", marginTop:"4px", opacity:loading?0.7:1 }}>
              {loading ? "..." : mode === "login" ? "Sign in" : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign:"center", fontSize:"13px", color:"#888", marginTop:"20px" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{ color:"#6c47ff", fontWeight:700, cursor:"pointer" }}>
              {mode === "login" ? "Register" : "Sign In"}
            </span>
          </p>
        </div>

        {/* ── Right: Feature Panel ── */}
        <div style={{ width:"420px", background:"linear-gradient(145deg,#7c3aed,#9f5fe8,#b16be0)", padding:"48px 36px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <h2 style={{ color:"#fff", fontSize:"26px", fontWeight:700, lineHeight:1.3, marginBottom:"10px" }}>
            Reimagine learning with practical AI tools
          </h2>
          <p style={{ color:"rgba(255,255,255,0.75)", fontSize:"13px", marginBottom:"32px", lineHeight:1.6 }}>
            Plan lessons, generate activities, and track concept mastery with one streamlined platform.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"10px" }}>
            {features.map(f => (
              <div key={f.label} style={{ background:"rgba(255,255,255,0.15)", borderRadius:"12px", padding:"14px 10px", display:"flex", flexDirection:"column", alignItems:"flex-start", gap:"8px", backdropFilter:"blur(4px)" }}>
                <span style={{ fontSize:"18px" }}>{f.icon}</span>
                <span style={{ color:"#fff", fontSize:"11.5px", fontWeight:500, lineHeight:1.3 }}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Study Session Modal ──────────────────────────────────────────────────────
function SessionModal({ concept, onClose, onLogged }) {
  const [score, setScore]       = useState(concept.mastery || 50);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const result = await api.logSession(concept.id, score, duration, notes);
      onLogged(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div>
            <div style={s.modalTitle}>Study Session</div>
            <div style={s.modalSub}>{concept.name}</div>
          </div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={s.authForm}>
          <div style={s.inputGroup}>
            <label style={s.label}>Score (0–100) — how well did you do?</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input type="range" min="0" max="100" value={score}
                onChange={e => setScore(Number(e.target.value))}
                style={{ flex: 1, accentColor: masteryColor(score) }} />
              <span style={{ ...s.scorePill, background: masteryColor(score) + "22", color: masteryColor(score) }}>
                {score}%
              </span>
            </div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Duration (minutes)</label>
            <input style={s.input} type="number" min="1" max="480" value={duration}
              onChange={e => setDuration(Number(e.target.value))} />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Notes (optional)</label>
            <textarea style={{ ...s.input, resize: "vertical", minHeight: "64px" }}
              placeholder="What did you cover?" value={notes}
              onChange={e => setNotes(e.target.value)} />
          </div>
          {error && <div style={s.authError}>{error}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" style={{ ...s.ghostBtn, flex: 1 }} onClick={onClose}>Cancel</button>
            <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center" }} disabled={loading}>
              {loading ? "Saving..." : "Log Session ✓"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Subject Modal ────────────────────────────────────────────────────────
function AddSubjectModal({ onClose, onCreated }) {
  const [name, setName]   = useState("");
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [icon, setIcon]   = useState(SUBJECT_ICONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const result = await api.createSubject(name, color, icon);
      onCreated(result.subject);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>New Subject</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={s.authForm}>
          <div style={s.inputGroup}>
            <label style={s.label}>Subject Name</label>
            <input style={s.input} placeholder="e.g. Mathematics" value={name}
              onChange={e => setName(e.target.value)} required />
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Color</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {SUBJECT_COLORS.map(c => (
                <button key={c} type="button"
                  style={{ width: "28px", height: "28px", borderRadius: "50%", background: c, border: color===c ? "2px solid #fff" : "2px solid transparent", cursor: "pointer" }}
                  onClick={() => setColor(c)} />
              ))}
            </div>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Icon</label>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {SUBJECT_ICONS.map(ic => (
                <button key={ic} type="button"
                  style={{ width: "36px", height: "36px", borderRadius: "6px", background: icon===ic ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: color, cursor: "pointer", fontSize: "14px", fontWeight: "700" }}
                  onClick={() => setIcon(ic)}>{ic}</button>
              ))}
            </div>
          </div>
          {error && <div style={s.authError}>{error}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" style={{ ...s.ghostBtn, flex: 1 }} onClick={onClose}>Cancel</button>
            <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center" }} disabled={loading}>
              {loading ? "Creating..." : "Create Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Concept Modal ────────────────────────────────────────────────────────
function AddConceptModal({ subjects, activeSubjectId, onClose, onCreated }) {
  const [name, setName]         = useState("");
  const [subjectId, setSubjectId] = useState(activeSubjectId || subjects[0]?.id || "");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const result = await api.createConcept(subjectId, name);
      onCreated(result.concept, Number(subjectId));
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <div style={s.modalTitle}>New Concept</div>
          <button style={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={s.authForm}>
          <div style={s.inputGroup}>
            <label style={s.label}>Subject</label>
            <select style={s.input} value={subjectId} onChange={e => setSubjectId(e.target.value)}>
              {subjects.map(sub => <option key={sub.id} value={sub.id}>{sub.name}</option>)}
            </select>
          </div>
          <div style={s.inputGroup}>
            <label style={s.label}>Concept Name</label>
            <input style={s.input} placeholder="e.g. Integration by Parts" value={name}
              onChange={e => setName(e.target.value)} required />
          </div>
          {error && <div style={s.authError}>{error}</div>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" style={{ ...s.ghostBtn, flex: 1 }} onClick={onClose}>Cancel</button>
            <button style={{ ...s.primaryBtn, flex: 2, justifyContent: "center" }} disabled={loading}>
              {loading ? "Adding..." : "Add Concept"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]                 = useState(null);
  const [authed, setAuthed]             = useState(false);
  const [subjects, setSubjects]         = useState([]);
  const [conceptsMap, setConceptsMap]   = useState({}); // subjectId -> concepts[]
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTab, setActiveTab]         = useState("overview"); // "overview" | "subject"
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [weekly, setWeekly]             = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [apiError, setApiError]         = useState("");
  const [modal, setModal]               = useState(null); // "session"|"addSubject"|"addConcept"
  const [profilePic, setProfilePic]       = useState(() => localStorage.getItem("apex_profile_pic") || null);
  const [theme, setTheme]                 = useState(() => localStorage.getItem("apex_theme") || "dark");
  const [accent, setAccent]               = useState(() => localStorage.getItem("apex_accent") || "#E8C547");
  const [appFont, setAppFont]             = useState(() => localStorage.getItem("apex_font") || "DM Mono");
  const [showStreak, setShowStreak]       = useState(() => localStorage.getItem("apex_show_streak") !== "false");

  const handleThemeChange  = (t) => { setTheme(t);   localStorage.setItem("apex_theme", t); };
  const handleAccentChange = (c) => { setAccent(c);  localStorage.setItem("apex_accent", c); };
  const handleFontChange   = (f) => { setAppFont(f); localStorage.setItem("apex_font", f); };
  const handleStreakToggle = (v) => { setShowStreak(v); localStorage.setItem("apex_show_streak", String(v)); };

  const handleProfileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      localStorage.setItem("apex_profile_pic", dataUrl);
      setProfilePic(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // ─ Check token on mount ─
  useEffect(() => {
    const token = localStorage.getItem("apex_token");
    if (!token) { setLoading(false); return; }
    api.getMe()
      .then(res => { setUser(res); setAuthed(true); })
      .catch(() => localStorage.removeItem("apex_token"))
      .finally(() => setLoading(false));
  }, []);

  // ─ Load data after auth ─
  const loadAll = useCallback(async () => {
    setApiError("");
    try {
      const [subRes, weekRes, statRes] = await Promise.all([
        api.getSubjects(), api.getWeekly(), api.getStats(),
      ]);
      setSubjects(subRes.subjects);
      setWeekly(weekRes.weekly);
      setStats(statRes.stats);
      if (subRes.subjects.length > 0) {
        const first = subRes.subjects[0];
        setActiveSubject(first);
        await loadConcepts(first.id);
      }
    } catch (err) {
      console.error(err);
      if (err.message?.includes("401") || err.message?.toLowerCase().includes("token") || err.message?.toLowerCase().includes("unauthorized")) {
        // Token invalid/expired — force re-login
        localStorage.removeItem("apex_token");
        setAuthed(false); setUser(null); setSubjects([]); setConceptsMap({});
      } else {
        setApiError("Failed to load data. Check your connection and try refreshing.");
      }
    }
  }, []);

  useEffect(() => { if (authed) loadAll(); }, [authed, loadAll]);

  async function loadConcepts(subjectId) {
    const res = await api.getConcepts(subjectId);
    setConceptsMap(prev => ({ ...prev, [subjectId]: res.concepts }));
  }

  async function handleSubjectSelect(sub) {
    setActiveSubject(sub);
    setActiveTab("subject");
    setSelectedConcept(null);
    await loadConcepts(sub.id);
  }

  async function handleDeleteConcept(e, concept) {
    e.stopPropagation();
    if (!window.confirm(`Delete "${concept.name}"?`)) return;
    await api.deleteConcept(concept.id);
    if (selectedConcept?.id === concept.id) setSelectedConcept(null);
    setConceptsMap(prev => ({
      ...prev,
      [concept.subject_id]: (prev[concept.subject_id] || []).filter(c => c.id !== concept.id),
    }));
  }

  function handleAuth(u) {
    setUser(u);
    setAuthed(true);
  }

  function logout() {
    localStorage.removeItem("apex_token");
    setAuthed(false);
    setUser(null);
    setSubjects([]);
    setConceptsMap({});
  }

  function handleSessionLogged(result) {
    // Update concept mastery + session_count in state
    setConceptsMap(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(sid => {
        updated[sid] = updated[sid].map(c =>
          c.id === result.concept.id
            ? { ...c, mastery: result.concept.mastery, status: result.concept.status, session_count: (Number(c.session_count) || 0) + 1 }
            : c
        );
      });
      return updated;
    });
    if (selectedConcept?.id === result.concept.id) {
      setSelectedConcept(prev => ({ ...prev, ...result.concept, session_count: (Number(prev.session_count) || 0) + 1 }));
    }
    // Refresh stats & weekly
    api.getStats().then(res => setStats(res.stats)).catch(console.error);
    api.getWeekly().then(res => setWeekly(res.weekly)).catch(console.error);
  }

  function handleSubjectCreated(sub) {
    setSubjects(prev => [...prev, sub]);
    setConceptsMap(prev => ({ ...prev, [sub.id]: [] }));
    // Auto-navigate to the new subject
    setActiveSubject(sub);
    setActiveTab("subject");
    setSelectedConcept(null);
  }

  function handleConceptCreated(concept, subjectId) {
    // Force reload that subject's concepts from server to get complete data
    loadConcepts(subjectId);
  }

  // ─ Loading ─
  if (loading) {
    return (
      <div style={{ ...s.authRoot, alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#E8C547", fontSize: "32px", letterSpacing: "4px" }}>◈</div>
      </div>
    );
  }

  if (!authed) return <AuthScreen onAuth={handleAuth} />;

  // ─ Derived stats ─
  const allConcepts = Object.values(conceptsMap).flat();
  const masteredCount = allConcepts.filter(c => c.status === "mastered").length;
  const avgMastery = allConcepts.length
    ? Math.round(allConcepts.reduce((a, c) => a + c.mastery, 0) / allConcepts.length)
    : 0;
  const studyHours = stats
    ? (stats.total_minutes / 60).toFixed(1)
    : "—";

  const activeConcepts = activeSubject ? (conceptsMap[activeSubject.id] || []) : [];

  // Build week chart — fill missing days with 0
  const todayIdx = new Date().getDay(); // 0=Sun
  const chartData = Array(7).fill(0);
  weekly.forEach(row => {
    const d = new Date(row.day + "T12:00:00");
    const dayIdx = (d.getDay() + 6) % 7; // Mon=0
    chartData[dayIdx] = row.avg_score || 0;
  });

  return (
    <div style={{ ...s.root, fontFamily: `'${appFont}','Courier New',monospace` }} className={theme === "light" ? "apex-light" : ""}>
      <style>{`
          :root { --apex-accent: ${accent}; }
          [style*="background: #E8C547"] { background: ${accent} !important; }
          [style*="color: #E8C547"] { color: ${accent} !important; }
          [style*="border: 1px solid rgba(232,197,71"] { border-color: ${accent}80 !important; }
          [style*="box-shadow"][style*="232,197,71"] { box-shadow: 0 0 0 3px ${accent}33 !important; }
          * { font-family: '${appFont}','Courier New',monospace !important; }
        `}</style>
      {theme === "light" && (
        <style>{`
          .apex-light { background: #F0EFE9 !important; color: #1A1A1A !important; }
          .apex-light * { scrollbar-color: rgba(0,0,0,0.15) transparent; }
          .apex-light aside { background: #E8E7E1 !important; border-color: rgba(0,0,0,0.08) !important; }
          .apex-light aside button { color: rgba(0,0,0,0.5) !important; }
          .apex-light aside button:not([style*="border-left: 3px solid #"]) { border-left-color: transparent !important; }
          .apex-light aside [style*="color: #E8E8E8"] { color: #1A1A1A !important; }
          .apex-light aside [style*="color: rgba(255,255,255"] { color: rgba(0,0,0,0.45) !important; }
          .apex-light aside [style*="background: rgba(255,255,255,0.04)"] { background: rgba(0,0,0,0.05) !important; }
          .apex-light aside [style*="background: transparent"] { background: transparent !important; }
          .apex-light aside [style*="border: 1px dashed rgba(255,255,255"] { border-color: rgba(0,0,0,0.15) !important; color: rgba(0,0,0,0.35) !important; }
          .apex-light main { background: transparent !important; }
          .apex-light h1 { color: #1A1A1A !important; }
          .apex-light [style*="color: rgba(255,255,255,0.3)"] { color: rgba(0,0,0,0.38) !important; }
          .apex-light [style*="color: rgba(255,255,255,0.35)"] { color: rgba(0,0,0,0.42) !important; }
          .apex-light [style*="color: rgba(255,255,255,0.4)"] { color: rgba(0,0,0,0.45) !important; }
          .apex-light [style*="color: rgba(255,255,255,0.5)"] { color: rgba(0,0,0,0.5) !important; }
          .apex-light [style*="color: rgba(255,255,255,0.6)"] { color: rgba(0,0,0,0.6) !important; }
          .apex-light [style*="color: #E8E8E8"] { color: #1A1A1A !important; }
          .apex-light [style*="color: #fff"] { color: #1A1A1A !important; }
          .apex-light [style*="background: #141414"] { background: #FFFFFF !important; border-color: rgba(0,0,0,0.08) !important; }
          .apex-light [style*="background: #0F0F0F"] { background: #F5F4EE !important; border-color: rgba(0,0,0,0.07) !important; }
          .apex-light [style*="background: #111"] { background: #FFFFFF !important; }
          .apex-light [style*="background: rgba(255,255,255,0.04)"] { background: rgba(0,0,0,0.04) !important; }
          .apex-light [style*="background: rgba(255,255,255,0.06)"] { background: rgba(0,0,0,0.05) !important; }
          .apex-light [style*="background: rgba(255,255,255,0.08)"] { background: rgba(0,0,0,0.06) !important; }
          .apex-light [style*="border: 1px solid rgba(255,255,255,0.05)"] { border-color: rgba(0,0,0,0.07) !important; }
          .apex-light [style*="border: 1px solid rgba(255,255,255,0.06)"] { border-color: rgba(0,0,0,0.07) !important; }
          .apex-light [style*="border: 1px solid rgba(255,255,255,0.07)"] { border-color: rgba(0,0,0,0.08) !important; }
          .apex-light [style*="border: 1px solid rgba(255,255,255,0.08)"] { border-color: rgba(0,0,0,0.09) !important; }
          .apex-light [style*="border: 1px solid rgba(255,255,255,0.1)"] { border-color: rgba(0,0,0,0.1) !important; }
          .apex-light [style*="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08)"] { background: rgba(0,0,0,0.05) !important; border-color: rgba(0,0,0,0.09) !important; }
          .apex-light [style*="height: 1px"][style*="rgba(255,255,255,0.06)"] { background: rgba(0,0,0,0.08) !important; }
          .apex-light [style*="background: rgba(0,0,0,0.7)"] { background: rgba(0,0,0,0.5) !important; }
          .apex-light input[style*="background: rgba(255,255,255"], .apex-light input { background: rgba(0,0,0,0.04) !important; border-color: rgba(0,0,0,0.1) !important; color: #1A1A1A !important; }
          .apex-light select { background: #F5F4EE !important; border-color: rgba(0,0,0,0.12) !important; color: #1A1A1A !important; }
          .apex-light [style*="masteryBar"], .apex-light [style*="background: rgba(255,255,255,0.06)"][style*="height: 4px"] { background: rgba(0,0,0,0.08) !important; }
          .apex-light [style*="chartLabel"] { color: rgba(0,0,0,0.3) !important; }
          .apex-light [style*="background: #141008"] { background: #FFFBEB !important; }
        `}</style>
      )}
      <div style={s.grain} />

      {/* ── API Error Banner ───────────────────────────────────────────── */}
      {apiError && (
        <div style={{ position:"fixed", top:"16px", left:"50%", transform:"translateX(-50%)", zIndex:9999, background:"#2a0a0a", border:"1px solid rgba(255,80,80,0.5)", borderRadius:"10px", padding:"12px 20px", display:"flex", alignItems:"center", gap:"12px", boxShadow:"0 4px 24px rgba(0,0,0,0.5)", maxWidth:"480px" }}>
          <span style={{ color:"#FF6B6B", fontSize:"16px" }}>⚠</span>
          <span style={{ color:"#FF9999", fontSize:"13px", flex:1 }}>{apiError}</span>
          <button onClick={() => { setApiError(""); loadAll(); }} style={{ background:"rgba(255,80,80,0.15)", border:"1px solid rgba(255,80,80,0.3)", borderRadius:"6px", color:"#FF6B6B", fontSize:"11px", fontWeight:700, cursor:"pointer", padding:"4px 10px", letterSpacing:"1px" }}>RETRY</button>
          <button onClick={() => setApiError("")} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.3)", cursor:"pointer", fontSize:"16px", padding:"0 4px" }}>✕</button>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {modal === "session" && selectedConcept && (
        <SessionModal concept={selectedConcept} onClose={() => setModal(null)} onLogged={handleSessionLogged} />
      )}
      {modal === "addSubject" && (
        <AddSubjectModal onClose={() => setModal(null)} onCreated={handleSubjectCreated} />
      )}
      {modal === "addConcept" && (
        <AddConceptModal subjects={subjects} activeSubjectId={activeSubject?.id} onClose={() => setModal(null)} onCreated={handleConceptCreated} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "12px", overflow: "hidden", marginBottom: "16px", background: "#0D1233", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src="/apex-logo.png" alt="APEX" style={{ width: "85%", height: "85%", objectFit: "contain", display: "block" }} />
        </div>

        {/* Overview Tab */}
        <button onClick={() => { setActiveTab("overview"); setActiveSubject(null); setSelectedConcept(null); }}
          style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", padding:"9px 10px", borderRadius:"7px", border:"none", marginBottom:"4px", cursor:"pointer", background: activeTab==="overview" ? `${accent}18` : "transparent", borderLeft: activeTab==="overview" ? `3px solid ${accent}` : "3px solid transparent", color: activeTab==="overview" ? accent : "rgba(255,255,255,0.5)", fontSize:"11px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>
          ◈ Overview
        </button>
        <button onClick={() => { setActiveTab("settings"); setActiveSubject(null); setSelectedConcept(null); }}
          style={{ display:"flex", alignItems:"center", gap:"8px", width:"100%", padding:"9px 10px", borderRadius:"7px", border:"none", marginBottom:"4px", cursor:"pointer", background: activeTab==="settings" ? "rgba(129,140,248,0.1)" : "transparent", borderLeft: activeTab==="settings" ? "3px solid #818CF8" : "3px solid transparent", color: activeTab==="settings" ? "#818CF8" : "rgba(255,255,255,0.5)", fontSize:"11px", fontWeight:700, letterSpacing:"1px", textTransform:"uppercase" }}>
          <span>⚙</span><span>Settings</span>
        </button>

        <div style={s.sidebarDivider} />
        <p style={s.sidebarLabel}>SUBJECTS</p>

        {subjects.map(sub => (
          <button key={sub.id} style={{
            ...s.subjectBtn,
            ...(activeSubject?.id === sub.id && activeTab === "subject" ? { borderLeft: `3px solid ${sub.color}`, background: "rgba(255,255,255,0.04)" } : {}),
          }} onClick={() => handleSubjectSelect(sub)}>
            <span style={{ color: sub.color, fontSize: "15px", width: "20px", textAlign: "center", fontWeight: "700" }}>{sub.icon}</span>
            <div>
              <div style={s.subjectName}>{sub.name}</div>
              <div style={s.subjectCount}>{sub.concept_count ?? 0} concepts</div>
            </div>
            <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: sub.color, marginLeft: "auto" }} />
          </button>
        ))}

        <button style={s.addSubjectBtn} onClick={() => setModal("addSubject")}>
          + New Subject
        </button>

        <div style={{ ...s.sidebarDivider, marginTop: "12px" }} />
        <p style={s.sidebarLabel}>CALENDAR</p>
        <div style={{ padding: "0 4px", marginBottom: "12px" }}>
          <MiniCalendar />
        </div>

        <div style={{ ...s.sidebarDivider, marginTop: "auto" }} />
        <div style={s.sidebarBottom}>
          <div style={s.userAvatar}>
            {profilePic
              ? <img src={profilePic} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover", borderRadius:"50%" }} />
              : user?.name?.slice(0,2).toUpperCase()
            }
          </div>
          <div style={{ flex: 1 }}>
            <div style={s.userName}>{user?.name}</div>
            {showStreak && <div style={s.userStreak}>🔥 {user?.streak ?? 0} day streak</div>}
          </div>
        </div>
        <button onClick={logout}
          style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"8px", width:"100%", marginTop:"10px", padding:"10px 14px", background:"rgba(255,80,80,0.08)", border:"1px solid rgba(255,80,80,0.25)", borderRadius:"8px", color:"#FF6B6B", fontSize:"12px", fontWeight:700, letterSpacing:"1px", cursor:"pointer", textTransform:"uppercase" }}>
          ⇥ Log Out
        </button>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main style={s.main}>
        <header style={s.header}>
          <div>
            <h1 style={s.pageTitle}>{activeTab === "settings" ? "Settings" : activeTab === "overview" ? "Overall Performance" : (activeSubject?.name ?? "Dashboard")}</h1>
            <p style={s.pageDate}>{new Date().toLocaleDateString("en-US", { weekday:"long", month:"long", day:"numeric" })}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {activeTab !== "overview" && activeTab !== "settings" && (
              <>
                <button style={s.ghostBtn} onClick={() => setModal("addConcept")}>+ Concept</button>
                <button style={{ ...s.primaryBtn, background: accent, color: accent.toLowerCase() === "#ff6b6b" || accent.toLowerCase() === "#818cf8" ? "#fff" : "#000" }}
                  disabled={!selectedConcept}
                  onClick={() => selectedConcept && setModal("session")}>
                  {selectedConcept ? `Study: ${selectedConcept.name}` : "Select a Concept"}
                </button>
              </>
            )}
            {/* Profile icon */}
            <div style={{ position: "relative" }}>
              <input
                type="file"
                accept="image/*"
                id="profile-upload"
                style={{ display: "none" }}
                onChange={handleProfileUpload}
              />
              <label
                htmlFor="profile-upload"
                title="Click to change profile picture"
                style={{
                  width: "42px", height: "42px", borderRadius: "50%",
                  background: profilePic ? "transparent" : "linear-gradient(135deg,#E8C547,#818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", flexShrink: 0, overflow: "hidden",
                  border: "2px solid rgba(232,197,71,0.5)",
                  boxShadow: "0 0 0 3px rgba(232,197,71,0.12)",
                  fontSize: "13px", fontWeight: "700", color: "#000",
                  transition: "box-shadow 0.2s",
                }}
              >
                {profilePic
                  ? <img src={profilePic} alt="profile" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                  : (user?.name?.slice(0,2).toUpperCase() || "ME")
                }
              </label>
            </div>
          </div>
        </header>

        {activeTab === "settings" ? (
          <SettingsPanel
            user={user}
            profilePic={profilePic}
            onProfileUpload={handleProfileUpload}
            onLogout={logout}
            theme={theme}
            onThemeChange={handleThemeChange}
            accent={accent}
            onAccentChange={handleAccentChange}
            appFont={appFont}
            onFontChange={handleFontChange}
            streakVisible={showStreak}
            onStreakToggle={handleStreakToggle}
          />
        ) : activeTab === "overview" ? (
          <OverallDashboard
            subjects={subjects}
            conceptsMap={conceptsMap}
            stats={stats}
            weekly={weekly}
            user={user}
          />
        ) : (<>

        {/* Stats row */}
        <div style={s.statsRow}>
          {[
            { label: "Total Concepts", value: allConcepts.length },
            { label: "Mastered", value: masteredCount },
            { label: "Avg. Mastery", value: `${avgMastery}%` },
            { label: "Study Hours", value: studyHours + "h" },
          ].map((st, i) => (
            <div key={i} style={s.statCard}>
              <div style={s.statLabel}>{st.label}</div>
              <div style={s.statValue}>{st.value}</div>
            </div>
          ))}
        </div>

        <div style={s.contentGrid}>
          {/* Concepts panel */}
          <div style={s.conceptsPanel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>Concepts</span>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
                {activeConcepts.length} total
              </span>
            </div>
            {activeConcepts.length === 0 ? (
              <div style={s.emptyState}>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>◎</div>
                <div>No concepts yet.</div>
                <button style={{ ...s.ghostBtn, marginTop: "10px" }} onClick={() => setModal("addConcept")}>
                  + Add First Concept
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeConcepts.map(concept => {
                  const cfg = STATUS_CONFIG[concept.status] || STATUS_CONFIG.new;
                  const isSelected = selectedConcept?.id === concept.id;
                  const lastStudied = concept.last_studied
                    ? new Date(concept.last_studied).toLocaleDateString()
                    : "Never";
                  return (
                    <div key={concept.id}
                      style={{ ...s.conceptCard, ...(isSelected ? s.conceptCardActive : {}) }}
                      onClick={() => setSelectedConcept(isSelected ? null : concept)}>
                      <div style={s.conceptTop}>
                        <div style={s.conceptName}>{concept.name}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ ...s.statusBadge, background: cfg.bg, color: cfg.text }}>
                            <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: cfg.dot, display: "inline-block", marginRight: "5px" }} />
                            {cfg.label}
                          </span>
                          <button onClick={e => handleDeleteConcept(e, concept)}
                            title="Delete concept"
                            style={{ background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: "5px", color: "#FF6B6B", cursor: "pointer", fontSize: "11px", padding: "2px 7px", lineHeight: 1.4 }}>✕</button>
                        </div>
                      </div>
                      <div style={s.masteryRow}>
                        <div style={s.masteryBar}>
                          <div style={{ ...s.masteryFill, width: `${concept.mastery}%`, background: masteryColor(concept.mastery) }} />
                        </div>
                        <span style={s.masteryPct}>{concept.mastery}%</span>
                      </div>
                      <div style={s.conceptMeta}>
                        <span style={s.metaItem}>◷ {lastStudied}</span>
                        <span style={s.metaItem}>⊛ {concept.session_count ?? 0} sessions</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div style={s.rightPanel}>
            {/* Chart */}
            <div style={s.chartCard}>
              <div style={s.panelHeader}>
                <span style={s.panelTitle}>Weekly Activity</span>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>avg score</span>
              </div>
              <div style={s.chart}>
                {chartData.map((val, i) => (
                  <div key={i} style={s.chartCol}>
                    <div style={s.chartBarWrap}>
                      <div style={{
                        ...s.chartBar,
                        height: `${val || 4}%`,
                        background: i === (new Date().getDay() + 6) % 7
                          ? "linear-gradient(to top, #E8C547, #4ECDC4)"
                          : "rgba(255,255,255,0.08)",
                      }} />
                    </div>
                    <div style={s.chartLabel}>{WEEK_LABELS[i].slice(0,1)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Concept detail or heat map */}
            {selectedConcept ? (
              <div style={s.detailCard}>
                <div style={s.modalHeader}>
                  <div>
                    <div style={s.detailTitle}>{selectedConcept.name}</div>
                    <div style={s.detailSub}>Concept Detail</div>
                  </div>
                  <button style={s.closeBtn} onClick={() => setSelectedConcept(null)}>✕</button>
                </div>

                <div style={{ display: "flex", justifyContent: "center", margin: "12px 0" }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <circle cx="60" cy="60" r="50" fill="none"
                      stroke={masteryColor(selectedConcept.mastery)} strokeWidth="8"
                      strokeDasharray={`${(selectedConcept.mastery / 100) * 314} 314`}
                      strokeLinecap="round" transform="rotate(-90 60 60)" />
                    <text x="60" y="55" textAnchor="middle" fill="white" fontSize="22" fontWeight="700" fontFamily="monospace">
                      {selectedConcept.mastery}
                    </text>
                    <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10" fontFamily="monospace">
                      MASTERY
                    </text>
                  </svg>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  {[
                    { label: "Sessions", val: selectedConcept.session_count ?? 0 },
                    { label: "Last Studied", val: selectedConcept.last_studied ? new Date(selectedConcept.last_studied).toLocaleDateString() : "Never" },
                    { label: "Status", val: STATUS_CONFIG[selectedConcept.status]?.label ?? "New" },
                  ].map((d, i) => (
                    <div key={i} style={s.detailStatRow}>
                      <span style={s.statLabel}>{d.label}</span>
                      <span style={{ fontSize: "12px", color: "#fff", fontWeight: "600" }}>{d.val}</span>
                    </div>
                  ))}
                </div>
                <button style={{ ...s.primaryBtn, width: "100%", justifyContent: "center", marginTop: "14px" }}
                  onClick={() => setModal("session")}>
                  Start Review Session →
                </button>
              </div>
            ) : (
              <div style={s.detailCard}>
                <div style={s.panelHeader}>
                  <span style={s.panelTitle}>Mastery Map</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "6px", marginTop: "14px" }}>
                  {allConcepts.map(c => (
                    <div key={c.id} title={c.name}
                      style={{ aspectRatio: "1", borderRadius: "4px", cursor: "pointer",
                        background: masteryColor(c.mastery),
                        opacity: 0.2 + (c.mastery / 100) * 0.8 }}
                      onClick={() => setSelectedConcept(c)} />
                  ))}
                  {Array.from({ length: Math.max(0, 20 - allConcepts.length) }).map((_, i) => (
                    <div key={`e${i}`} style={{ aspectRatio: "1", borderRadius: "4px", background: "rgba(255,255,255,0.04)" }} />
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>0%</span>
                  <div style={{ flex: 1, height: "4px", borderRadius: "2px", background: "linear-gradient(to right, #FF6B6B, #FB923C, #E8C547, #4ADE80)" }} />
                  <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.3)" }}>100%</span>
                </div>
              </div>
            )}

          </div>
        </div>
        </>)}
      </main>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  root: { display: "flex", minHeight: "100vh", background: "#0A0A0A", fontFamily: "'DM Mono','Courier New',monospace", color: "#E8E8E8", position: "relative" },
  grain: { position: "fixed", inset: 0, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`, pointerEvents: "none", zIndex: 999 },

  // Auth
  authRoot: { display: "flex", minHeight: "100vh", background: "#0A0A0A", fontFamily: "'DM Mono','Courier New',monospace", color: "#E8E8E8", alignItems: "center", justifyContent: "center", position: "relative" },
  authCard: { background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "40px", width: "360px" },
  authLogo: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" },
  authSubtitle: { fontSize: "10px", letterSpacing: "3px", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: 0, marginBottom: "24px" },
  authTabs: { display: "flex", gap: "4px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "4px", marginBottom: "20px" },
  authTab: { flex: 1, padding: "8px", border: "none", borderRadius: "6px", background: "transparent", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "12px", letterSpacing: "1px", textTransform: "uppercase" },
  authTabActive: { background: "rgba(255,255,255,0.08)", color: "#fff" },
  authForm: { display: "flex", flexDirection: "column", gap: "14px" },
  authError: { background: "#200D0D", color: "#FF6B6B", padding: "10px 12px", borderRadius: "6px", fontSize: "12px", border: "1px solid rgba(255,107,107,0.2)" },

  // Inputs
  inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "10px", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)" },
  input: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "10px 12px", color: "#fff", fontSize: "13px", fontFamily: "inherit", outline: "none" },

  // Buttons
  primaryBtn: { display: "flex", alignItems: "center", gap: "8px", background: "#E8C547", color: "#000", border: "none", padding: "10px 18px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "700", letterSpacing: "0.5px", fontFamily: "inherit", whiteSpace: "nowrap" },
  ghostBtn: { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", padding: "10px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontFamily: "inherit", letterSpacing: "0.5px" },
  scorePill: { padding: "4px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "700", minWidth: "44px", textAlign: "center" },

  // Modal
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal: { background: "#141414", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "28px", width: "400px", maxWidth: "90vw" },
  modalHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" },
  modalTitle: { fontSize: "16px", fontWeight: "700", color: "#fff" },
  modalSub: { fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "3px" },
  closeBtn: { background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(255,255,255,0.4)", width: "28px", height: "28px", borderRadius: "50%", cursor: "pointer", fontSize: "11px" },

  // Sidebar
  sidebar: { width: "240px", minHeight: "100vh", background: "#0F0F0F", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "24px 14px", display: "flex", flexDirection: "column", gap: "2px", flexShrink: 0 },
  logo: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" },
  logoText: { fontSize: "18px", fontWeight: "700", letterSpacing: "4px", color: "#fff" },
  logoSub: { fontSize: "9px", letterSpacing: "3px", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", margin: "0 0 16px 30px" },
  sidebarDivider: { height: "1px", background: "rgba(255,255,255,0.06)", margin: "10px 0" },
  sidebarLabel: { fontSize: "9px", letterSpacing: "3px", color: "rgba(255,255,255,0.2)", textTransform: "uppercase", padding: "0 10px", marginBottom: "4px" },
  subjectBtn: { display: "flex", alignItems: "center", gap: "10px", background: "transparent", border: "none", borderLeft: "3px solid transparent", color: "#E8E8E8", padding: "9px 10px", borderRadius: "4px", cursor: "pointer", width: "100%", textAlign: "left" },
  subjectName: { fontSize: "12px", fontWeight: "600", letterSpacing: "0.3px" },
  subjectCount: { fontSize: "10px", color: "rgba(255,255,255,0.3)", marginTop: "1px" },
  addSubjectBtn: { background: "transparent", border: "1px dashed rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.3)", padding: "8px", borderRadius: "6px", cursor: "pointer", fontSize: "11px", letterSpacing: "1px", width: "100%", marginTop: "6px", fontFamily: "inherit" },
  sidebarBottom: { display: "flex", alignItems: "center", gap: "8px", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.04)" },
  userAvatar: { width: "30px", height: "30px", borderRadius: "50%", background: "linear-gradient(135deg,#E8C547,#4ECDC4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "700", color: "#000", flexShrink: 0 },
  userName: { fontSize: "11px", fontWeight: "600", color: "#fff" },
  userStreak: { fontSize: "10px", color: "rgba(255,255,255,0.35)", marginTop: "1px" },
  logoutBtn: { background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "16px", padding: "4px" },

  // Main
  main: { flex: 1, padding: "28px 30px", overflow: "auto" },
  header: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" },
  pageTitle: { fontSize: "24px", fontWeight: "700", letterSpacing: "-0.5px", margin: 0, color: "#fff" },
  pageDate: { fontSize: "11px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: "4px" },

  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" },
  statCard: { background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px 18px" },
  statLabel: { fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" },
  statValue: { fontSize: "26px", fontWeight: "700", color: "#fff", letterSpacing: "-1px" },

  contentGrid: { display: "grid", gridTemplateColumns: "1fr 270px", gap: "14px" },
  conceptsPanel: { background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "10px" },
  panelHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  panelTitle: { fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" },
  emptyState: { textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontSize: "13px" },

  conceptCard: { background: "#0F0F0F", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "8px", padding: "13px 15px", cursor: "pointer" },
  conceptCardActive: { border: "1px solid rgba(232,197,71,0.3)", background: "#141008" },
  conceptTop: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" },
  conceptName: { fontSize: "13px", fontWeight: "600", color: "#fff" },
  statusBadge: { display: "flex", alignItems: "center", padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "600", letterSpacing: "0.5px" },
  masteryRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" },
  masteryBar: { flex: 1, height: "4px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" },
  masteryFill: { height: "100%", borderRadius: "2px" },
  masteryPct: { fontSize: "11px", color: "rgba(255,255,255,0.4)", minWidth: "28px", textAlign: "right" },
  conceptMeta: { display: "flex", gap: "12px" },
  metaItem: { fontSize: "10px", color: "rgba(255,255,255,0.3)" },

  rightPanel: { display: "flex", flexDirection: "column", gap: "12px" },
  chartCard: { background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "18px" },
  chart: { display: "flex", gap: "5px", height: "90px", alignItems: "flex-end", marginTop: "12px" },
  chartCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "5px" },
  chartBarWrap: { flex: 1, width: "100%", display: "flex", alignItems: "flex-end" },
  chartBar: { width: "100%", borderRadius: "3px 3px 0 0", minHeight: "4px" },
  chartLabel: { fontSize: "9px", color: "rgba(255,255,255,0.25)" },

  detailCard: { background: "#141414", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "12px", padding: "18px", flex: 1 },
  detailTitle: { fontSize: "15px", fontWeight: "700", color: "#fff" },
  detailSub: { fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", marginTop: "2px" },
  detailStatRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" },
};
