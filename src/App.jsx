import { useState, useEffect, useCallback, useRef } from "react";

// ─── Storage Abstraction ────────────────────────────────────────────
// Uses window.storage in Claude artifacts, falls back to localStorage for Vercel
const store = {
  async get(key) {
    try {
      if (window.storage) {
        const r = await window.storage.get(key);
        return r ? JSON.parse(r.value) : null;
      }
      const v = localStorage.getItem(`cops_${key}`);
      return v ? JSON.parse(v) : null;
    } catch { return null; }
  },
  async set(key, value) {
    try {
      const s = JSON.stringify(value);
      if (window.storage) { await window.storage.set(key, s); }
      else { localStorage.setItem(`cops_${key}`, s); }
    } catch (e) { console.error("Storage error:", e); }
  },
  async del(key) {
    try {
      if (window.storage) { await window.storage.delete(key); }
      else { localStorage.removeItem(`cops_${key}`); }
    } catch {}
  }
};

// ─── Default Data ───────────────────────────────────────────────────
const DEFAULT_ACCOUNTS = Array.from({ length: 5 }, (_, i) => ({
  id: i + 1, name: "", product: "", avatar: "", lang: "en"
}));

const DEFAULT_ANGLES = {
  "Pain point": [
    "You're dehydrated and don't even know it",
    "That afternoon crash isn't normal",
    "Your skin is begging for help",
    "Bloating after every meal? Here's why",
    "Why you wake up tired after 8 hours"
  ],
  "Myth bust": [
    "Drinking 8 glasses isn't enough",
    "Expensive skincare doesn't mean effective",
    "Electrolytes aren't just for athletes",
    "Collagen pills alone won't fix your skin",
    "Detox teas are a marketing scam"
  ],
  "Quick test": [
    "Pinch your skin — here's what it means",
    "Check your nails for this one sign",
    "Press your shin for 5 seconds",
    "Look at your tongue right now",
    "This 10-second hydration test"
  ],
  "Social proof": [
    "She tried everything — then found this",
    "3 weeks in, her skin completely changed",
    "Thousands of women over 40 swear by this",
    "Her doctor couldn't believe the difference",
    "After 60 days the results speak for themselves"
  ],
  "Education": [
    "Your body absorbs water differently than you think",
    "What electrolytes actually do inside your cells",
    "The science behind beetroot and blood pressure",
    "Why your gut controls your skin",
    "How inflammation ages you 10 years faster"
  ],
  "Urgency": [
    "Every day without this costs your body",
    "Don't wait until the damage is done",
    "This won't be available at this price long",
    "Your body can't wait another month",
    "Start today or keep feeling the same"
  ]
};

const STEPS = ["Scripted", "Rendered", "Edited", "Posted"];

const CATEGORIES = Object.keys(DEFAULT_ANGLES);

// ─── Icons (inline SVG) ─────────────────────────────────────────────
const Icons = {
  Accounts: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Angles: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  ),
  Prompt: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>
    </svg>
  ),
  Tracker: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  Copy: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  ),
  Sun: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ),
  Moon: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Plus: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  X: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  Search: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  Refresh: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
    </svg>
  ),
  Check: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

// ─── Styles ─────────────────────────────────────────────────────────
const getStyles = (dark) => {
  const v = dark
    ? {
        bg: "#0C0C0E", bgCard: "#16161A", bgCardHover: "#1C1C22",
        bgInput: "#1E1E24", border: "#2A2A32", borderFocus: "#3D5AFE",
        text: "#E8E8EC", textMuted: "#8888A0", textDim: "#55556A",
        accent: "#3D5AFE", accentSoft: "rgba(61,90,254,0.12)",
        green: "#00E676", greenSoft: "rgba(0,230,118,0.12)",
        red: "#FF5252", redSoft: "rgba(255,82,82,0.1)",
        orange: "#FFAB40", orangeSoft: "rgba(255,171,64,0.1)",
        yellow: "#FFD740", yellowSoft: "rgba(255,215,64,0.1)",
        shadow: "0 1px 3px rgba(0,0,0,0.4)",
      }
    : {
        bg: "#F4F4F7", bgCard: "#FFFFFF", bgCardHover: "#F8F8FB",
        bgInput: "#F0F0F5", border: "#E0E0E8", borderFocus: "#3D5AFE",
        text: "#1A1A2E", textMuted: "#6B6B80", textDim: "#9999AD",
        accent: "#3D5AFE", accentSoft: "rgba(61,90,254,0.08)",
        green: "#00C853", greenSoft: "rgba(0,200,83,0.1)",
        red: "#D32F2F", redSoft: "rgba(211,47,47,0.08)",
        orange: "#EF6C00", orangeSoft: "rgba(239,108,0,0.08)",
        yellow: "#F9A825", yellowSoft: "rgba(249,168,37,0.08)",
        shadow: "0 1px 3px rgba(0,0,0,0.08)",
      };
  return v;
};

// ─── Main App ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("accounts");
  const [dark, setDark] = useState(true);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [angles, setAngles] = useState(DEFAULT_ANGLES);
  const [selected, setSelected] = useState([]);
  const [tracker, setTracker] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [trendResults, setTrendResults] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newAngle, setNewAngle] = useState("");
  const [newAngleCat, setNewAngleCat] = useState(CATEGORIES[0]);
  const [showAddAngle, setShowAddAngle] = useState(false);

  const c = getStyles(dark);

  // Load from storage
  useEffect(() => {
    (async () => {
      const [a, an, s, t, d] = await Promise.all([
        store.get("accounts"),
        store.get("angles"),
        store.get("selected"),
        store.get("tracker"),
        store.get("darkMode"),
      ]);
      if (a) setAccounts(a);
      if (an) setAngles(an);
      if (s) setSelected(s);
      if (t) setTracker(t);
      if (d !== null) setDark(d);
      setLoaded(true);
    })();
  }, []);

  // Auto-save
  useEffect(() => { if (loaded) store.set("accounts", accounts); }, [accounts, loaded]);
  useEffect(() => { if (loaded) store.set("angles", angles); }, [angles, loaded]);
  useEffect(() => { if (loaded) store.set("selected", selected); }, [selected, loaded]);
  useEffect(() => { if (loaded) store.set("tracker", tracker); }, [tracker, loaded]);
  useEffect(() => { if (loaded) store.set("darkMode", dark); }, [dark, loaded]);

  const updateAccount = (id, field, value) => {
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const toggleAngle = (angle) => {
    setSelected(prev =>
      prev.includes(angle) ? prev.filter(a => a !== angle)
        : prev.length < 10 ? [...prev, angle] : prev
    );
  };

  const addAngle = (cat, text) => {
    if (!text.trim()) return;
    setAngles(prev => ({ ...prev, [cat]: [...(prev[cat] || []), text.trim()] }));
  };

  const removeAngle = (cat, idx) => {
    const angle = angles[cat][idx];
    setAngles(prev => ({ ...prev, [cat]: prev[cat].filter((_, i) => i !== idx) }));
    setSelected(prev => prev.filter(a => a !== angle));
  };

  const toggleStep = (videoKey, step) => {
    setTracker(prev => {
      const cur = prev[videoKey] || {};
      return { ...prev, [videoKey]: { ...cur, [step]: !cur[step] } };
    });
  };

  const resetTracker = () => setTracker({});

  const getVideoKeys = () => {
    const keys = [];
    const configured = accounts.filter(a => a.name);
    configured.forEach(a => {
      keys.push({ key: `${a.id}-A`, label: `${a.name} — Video A`, account: a });
      keys.push({ key: `${a.id}-B`, label: `${a.name} — Video B`, account: a });
    });
    return keys;
  };

  const completedCount = () => {
    const videos = getVideoKeys();
    return videos.filter(v => STEPS.every(s => tracker[v.key]?.[s])).length;
  };

  // Build prompt
  const buildPrompt = () => {
    const configured = accounts.filter(a => a.name);
    if (!configured.length || !selected.length) return "";

    let prompt = `You are a direct-response health & wellness copywriter. Write ${configured.length * 2} short-form video scripts (2 per account) for Facebook Reels.\n\n`;
    prompt += `ACCOUNTS:\n`;
    configured.forEach((a, i) => {
      prompt += `${i + 1}. "${a.name}" — Product: ${a.product || "TBD"} | Avatar: ${a.avatar || "TBD"} | Language: ${a.lang === "es" ? "Spanish" : "English"}\n`;
    });

    prompt += `\nSELECTED ANGLES (use these across scripts, vary distribution):\n`;
    selected.forEach((s, i) => { prompt += `${i + 1}. ${s}\n`; });

    prompt += `\nSCRIPT FORMAT (for each of the ${configured.length * 2} scripts):\n`;
    prompt += `**[Account Name — Video A or B]**\n`;
    prompt += `**Hook** (first 3 seconds, pattern interrupt, ≤25 words)\n`;
    prompt += `**Value** (3-5 lines, educational, authority tone, each line ≤25 words, include [VISUAL: description] tags for B-roll)\n`;
    prompt += `**CTA** (natural but decisive, directs to link in bio)\n`;
    prompt += `**FDA Disclaimer:** "These statements have not been evaluated by the FDA. This product is not intended to diagnose, treat, cure, or prevent any disease."\n`;
    prompt += `**Comment Trigger:** (one engaging question to boost comments)\n`;
    prompt += `**Caption:** (pain-point hook → social proof line → CTA to link in bio → FDA disclaimer)\n`;

    prompt += `\nRULES:\n`;
    prompt += `- Every single line ≤25 words. No exceptions.\n`;
    prompt += `- Authority tone: educational, confident, calm urgency.\n`;
    prompt += `- Compliance-safe: no disease claims, no guaranteed results.\n`;
    prompt += `- Include [VISUAL: description] B-roll tags in value section.\n`;
    prompt += `- Spanish accounts get fully Spanish scripts including caption & disclaimer.\n`;
    prompt += `- No fluff, no filler, no motivational padding.\n`;
    prompt += `- Comment trigger should provoke genuine engagement.\n\n`;
    prompt += `Write all ${configured.length * 2} scripts now.`;

    return prompt;
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert("Copy failed — try manually selecting the text."); }
  };

  // Trending research via Claude API
  // In Claude artifact: direct API call (no key needed)
  // On Vercel: proxied through /api/trending serverless function
  const fetchTrending = async () => {
    setTrendLoading(true);
    setTrendResults([]);
    try {
      const isClaudeArtifact = !!window.storage;
      let data;

      if (isClaudeArtifact) {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1000,
            tools: [{ type: "web_search_20250305", name: "web_search" }],
            messages: [{
              role: "user",
              content: `Search for the latest trending health and wellness hooks, topics, and viral angles on Facebook Reels and TikTok in 2026. Focus on: supplements, hydration, skincare, gut health, anti-aging, energy, and natural remedies.

Return ONLY a JSON array of 8-10 short hook/angle strings (each ≤15 words). No explanation, no markdown, no backticks. Just the raw JSON array. Example format:
["Hook one here", "Hook two here"]`
            }]
          })
        });
        data = await response.json();
      } else {
        const response = await fetch("/api/trending", { method: "POST" });
        data = await response.json();
      }

      const textBlock = data.content?.find(b => b.type === "text");
      if (textBlock?.text) {
        const clean = textBlock.text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(clean);
        if (Array.isArray(parsed)) {
          setTrendResults(parsed);
        }
      }
    } catch (err) {
      console.error("Trending fetch error:", err);
      setTrendResults(["Error fetching trends — check console"]);
    }
    setTrendLoading(false);
  };

  // ─── Shared Styles ──────────────────────────────────────────────
  const S = {
    app: {
      minHeight: "100vh",
      background: c.bg,
      color: c.text,
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
      transition: "background 0.3s, color 0.3s",
    },
    header: {
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "16px 20px", borderBottom: `1px solid ${c.border}`,
      background: c.bgCard,
    },
    logo: {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: "15px", fontWeight: 700, letterSpacing: "-0.5px",
      color: c.text,
    },
    logoAccent: { color: c.accent },
    themeBtn: {
      background: "none", border: `1px solid ${c.border}`, borderRadius: "8px",
      padding: "6px 8px", cursor: "pointer", color: c.textMuted,
      display: "flex", alignItems: "center", gap: "6px", fontSize: "12px",
      fontFamily: "'JetBrains Mono', monospace",
    },
    tabs: {
      display: "flex", borderBottom: `1px solid ${c.border}`,
      background: c.bgCard, overflowX: "auto",
    },
    tab: (active) => ({
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      gap: "6px", padding: "12px 16px", cursor: "pointer",
      fontSize: "13px", fontWeight: active ? 600 : 400,
      color: active ? c.accent : c.textMuted,
      borderBottom: active ? `2px solid ${c.accent}` : "2px solid transparent",
      background: "none", border: "none", borderBottomStyle: "solid",
      transition: "all 0.2s", whiteSpace: "nowrap",
      fontFamily: "'JetBrains Mono', monospace",
    }),
    content: { padding: "20px", maxWidth: "800px", margin: "0 auto" },
    card: {
      background: c.bgCard, border: `1px solid ${c.border}`,
      borderRadius: "12px", padding: "16px", marginBottom: "12px",
      boxShadow: c.shadow, transition: "all 0.2s",
    },
    input: {
      width: "100%", background: c.bgInput, border: `1px solid ${c.border}`,
      borderRadius: "8px", padding: "10px 12px", color: c.text,
      fontSize: "14px", outline: "none", boxSizing: "border-box",
      transition: "border-color 0.2s",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    },
    label: {
      fontSize: "11px", fontWeight: 600, textTransform: "uppercase",
      letterSpacing: "0.05em", color: c.textMuted, marginBottom: "6px",
      display: "block", fontFamily: "'JetBrains Mono', monospace",
    },
    langToggle: (active) => ({
      padding: "6px 14px", borderRadius: "6px", border: "none",
      cursor: "pointer", fontSize: "12px", fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace",
      background: active ? c.accentSoft : "transparent",
      color: active ? c.accent : c.textDim,
      transition: "all 0.2s",
    }),
    pill: (active) => ({
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "8px 14px", borderRadius: "8px", border: "none",
      cursor: "pointer", fontSize: "13px",
      background: active ? c.accentSoft : c.bgInput,
      color: active ? c.accent : c.textMuted,
      fontWeight: active ? 600 : 400,
      transition: "all 0.15s",
      border: `1px solid ${active ? c.accent + "40" : c.border}`,
    }),
    btn: (variant = "default") => {
      const base = {
        display: "inline-flex", alignItems: "center", gap: "6px",
        padding: "10px 18px", borderRadius: "8px", cursor: "pointer",
        fontSize: "13px", fontWeight: 600, border: "none",
        fontFamily: "'JetBrains Mono', monospace",
        transition: "all 0.2s",
      };
      if (variant === "primary") return { ...base, background: c.accent, color: "#fff" };
      if (variant === "green") return { ...base, background: c.green, color: "#000" };
      if (variant === "danger") return { ...base, background: c.redSoft, color: c.red };
      if (variant === "ghost") return { ...base, background: "transparent", color: c.textMuted, border: `1px solid ${c.border}` };
      return { ...base, background: c.bgInput, color: c.text, border: `1px solid ${c.border}` };
    },
    sectionTitle: {
      fontSize: "11px", fontWeight: 700, textTransform: "uppercase",
      letterSpacing: "0.08em", color: c.textDim, marginBottom: "12px",
      fontFamily: "'JetBrains Mono', monospace",
    },
    badge: (color, bgColor) => ({
      display: "inline-flex", alignItems: "center", padding: "2px 8px",
      borderRadius: "4px", fontSize: "11px", fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      color, background: bgColor,
    }),
    stepDot: (done) => ({
      width: "32px", height: "32px", borderRadius: "8px",
      display: "flex", alignItems: "center", justifyContent: "center",
      cursor: "pointer", fontSize: "10px", fontWeight: 700,
      fontFamily: "'JetBrains Mono', monospace",
      background: done ? c.greenSoft : c.bgInput,
      color: done ? c.green : c.textDim,
      border: `1.5px solid ${done ? c.green + "50" : c.border}`,
      transition: "all 0.15s",
    }),
    progressBar: {
      width: "100%", height: "6px", borderRadius: "3px",
      background: c.bgInput, overflow: "hidden",
    },
    progressFill: (pct) => ({
      width: `${pct}%`, height: "100%", borderRadius: "3px",
      background: `linear-gradient(90deg, ${c.accent}, ${c.green})`,
      transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
    }),
  };

  if (!loaded) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", color: c.textMuted, fontSize: "14px" }}>
          Loading dashboard...
        </div>
      </div>
    );
  }

  const tabIcons = { accounts: Icons.Accounts, angles: Icons.Angles, prompt: Icons.Prompt, tracker: Icons.Tracker };

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={S.header}>
        <div style={S.logo}>
          <span style={S.logoAccent}>CONTENT</span>OPS
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ ...S.badge(c.green, c.greenSoft) }}>
            {completedCount()}/{getVideoKeys().length} POSTED
          </span>
          <button style={S.themeBtn} onClick={() => setDark(!dark)}>
            {dark ? <Icons.Sun /> : <Icons.Moon />}
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav style={S.tabs}>
        {["accounts", "angles", "prompt", "tracker"].map(t => {
          const Ico = tabIcons[t];
          return (
            <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
              <Ico />{t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <div style={S.content}>

        {/* ━━━ ACCOUNTS TAB ━━━ */}
        {tab === "accounts" && (
          <div>
            <p style={{ ...S.sectionTitle, marginBottom: "16px" }}>
              5 Account Slots — Auto-saves
            </p>
            {accounts.map(a => (
              <div key={a.id} style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={S.badge(c.accent, c.accentSoft)}>ACCOUNT {a.id}</span>
                  <div style={{ display: "flex", gap: "2px", background: c.bgInput, borderRadius: "6px", padding: "2px" }}>
                    <button style={S.langToggle(a.lang === "en")} onClick={() => updateAccount(a.id, "lang", "en")}>EN</button>
                    <button style={S.langToggle(a.lang === "es")} onClick={() => updateAccount(a.id, "lang", "es")}>ES</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={S.label}>Account Name</label>
                    <input style={S.input} value={a.name} placeholder="e.g. Barry Health"
                      onChange={e => updateAccount(a.id, "name", e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Product</label>
                    <input style={S.input} value={a.product} placeholder="e.g. Beetroot Gummies"
                      onChange={e => updateAccount(a.id, "product", e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "10px" }}>
                  <label style={S.label}>Avatar Name</label>
                  <input style={S.input} value={a.avatar} placeholder="e.g. Dr. Barry"
                    onChange={e => updateAccount(a.id, "avatar", e.target.value)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ━━━ ANGLES TAB ━━━ */}
        {tab === "angles" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ ...S.sectionTitle, margin: 0 }}>
                Select 5–10 angles for today ({selected.length} selected)
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button style={S.btn("ghost")} onClick={() => setShowAddAngle(!showAddAngle)}>
                  <Icons.Plus /> Add
                </button>
                <button style={S.btn("primary")} onClick={fetchTrending} disabled={trendLoading}>
                  {trendLoading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.6s linear infinite" }} />
                      Searching…
                    </span>
                  ) : (
                    <><Icons.Search /> Trending Research</>
                  )}
                </button>
              </div>
            </div>

            {/* Add angle form */}
            {showAddAngle && (
              <div style={{ ...S.card, display: "flex", gap: "8px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div style={{ flex: "0 0 auto" }}>
                  <label style={S.label}>Category</label>
                  <select
                    style={{ ...S.input, width: "auto", cursor: "pointer" }}
                    value={newAngleCat}
                    onChange={e => setNewAngleCat(e.target.value)}
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label style={S.label}>Angle Text</label>
                  <input
                    style={S.input}
                    value={newAngle}
                    placeholder="Your custom angle..."
                    onChange={e => setNewAngle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && newAngle.trim()) {
                        addAngle(newAngleCat, newAngle);
                        setNewAngle("");
                      }
                    }}
                  />
                </div>
                <button
                  style={{ ...S.btn("primary"), marginBottom: "1px" }}
                  onClick={() => { addAngle(newAngleCat, newAngle); setNewAngle(""); }}
                >
                  Add
                </button>
              </div>
            )}

            {/* Trending results */}
            {trendResults.length > 0 && (
              <div style={{ ...S.card, borderColor: c.accent + "40" }}>
                <div style={{ ...S.sectionTitle, color: c.accent }}>Trending Suggestions</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {trendResults.map((t, i) => (
                    <button
                      key={i}
                      style={{
                        ...S.pill(false),
                        background: c.orangeSoft,
                        color: c.orange,
                        borderColor: c.orange + "30",
                      }}
                      onClick={() => {
                        addAngle("Pain point", t);
                        setTrendResults(prev => prev.filter((_, j) => j !== i));
                      }}
                    >
                      <Icons.Plus /> {t}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: "11px", color: c.textDim, marginTop: "8px" }}>
                  Tap to add to your Pain point bank. Edit category after adding.
                </p>
              </div>
            )}

            {/* Angle categories */}
            {CATEGORIES.map(cat => (
              <div key={cat} style={{ marginBottom: "20px" }}>
                <div style={{ ...S.sectionTitle, display: "flex", alignItems: "center", gap: "8px" }}>
                  {cat}
                  <span style={{ ...S.badge(c.textDim, c.bgInput), textTransform: "none", fontWeight: 500 }}>
                    {(angles[cat] || []).length}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(angles[cat] || []).map((angle, i) => (
                    <div key={i} style={{ position: "relative", display: "inline-flex" }}>
                      <button
                        style={S.pill(selected.includes(angle))}
                        onClick={() => toggleAngle(angle)}
                      >
                        {selected.includes(angle) && <Icons.Check />}
                        {angle}
                      </button>
                      <button
                        onClick={() => removeAngle(cat, i)}
                        style={{
                          position: "absolute", top: "-4px", right: "-4px",
                          width: "18px", height: "18px", borderRadius: "50%",
                          background: c.red, color: "#fff", border: "none",
                          cursor: "pointer", display: "flex",
                          alignItems: "center", justifyContent: "center",
                          fontSize: "10px", opacity: 0.8,
                        }}
                      >
                        <Icons.X />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ━━━ PROMPT TAB ━━━ */}
        {tab === "prompt" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ ...S.sectionTitle, margin: 0 }}>
                Auto-Generated Batch Prompt
              </p>
              <button
                style={S.btn(copied ? "green" : "primary")}
                onClick={copyPrompt}
                disabled={!buildPrompt()}
              >
                {copied ? <><Icons.Check /> Copied!</> : <><Icons.Copy /> Copy Prompt</>}
              </button>
            </div>

            {!accounts.filter(a => a.name).length && (
              <div style={{ ...S.card, textAlign: "center", color: c.textMuted, padding: "32px" }}>
                Configure at least one account in the Accounts tab first.
              </div>
            )}
            {accounts.filter(a => a.name).length > 0 && !selected.length && (
              <div style={{ ...S.card, textAlign: "center", color: c.textMuted, padding: "32px" }}>
                Select angles in the Angles tab to build your prompt.
              </div>
            )}
            {buildPrompt() && (
              <>
                <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
                  <span style={S.badge(c.accent, c.accentSoft)}>
                    {accounts.filter(a => a.name).length} ACCOUNTS
                  </span>
                  <span style={S.badge(c.green, c.greenSoft)}>
                    {selected.length} ANGLES
                  </span>
                  <span style={S.badge(c.orange, c.orangeSoft)}>
                    {accounts.filter(a => a.name).length * 2} SCRIPTS
                  </span>
                </div>
                <div style={{
                  ...S.card,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12px",
                  lineHeight: "1.7",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: c.textMuted,
                  maxHeight: "500px",
                  overflowY: "auto",
                }}>
                  {buildPrompt()}
                </div>
              </>
            )}
          </div>
        )}

        {/* ━━━ TRACKER TAB ━━━ */}
        {tab === "tracker" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "8px" }}>
              <p style={{ ...S.sectionTitle, margin: 0 }}>
                Daily Pipeline — {completedCount()}/{getVideoKeys().length} Complete
              </p>
              <button style={S.btn("danger")} onClick={resetTracker}>
                <Icons.Refresh /> Reset Day
              </button>
            </div>

            {/* Progress bar */}
            <div style={{ ...S.card, padding: "12px 16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: c.textMuted }}>
                  PROGRESS
                </span>
                <span style={{ fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: c.green }}>
                  {getVideoKeys().length > 0 ? Math.round((completedCount() / getVideoKeys().length) * 100) : 0}%
                </span>
              </div>
              <div style={S.progressBar}>
                <div style={S.progressFill(
                  getVideoKeys().length > 0 ? (completedCount() / getVideoKeys().length) * 100 : 0
                )} />
              </div>
            </div>

            {!getVideoKeys().length && (
              <div style={{ ...S.card, textAlign: "center", color: c.textMuted, padding: "32px" }}>
                Configure accounts first. Each named account generates 2 video slots.
              </div>
            )}

            {/* Step legend */}
            {getVideoKeys().length > 0 && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
                {STEPS.map((s, i) => (
                  <span key={s} style={{ fontSize: "11px", color: c.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {i + 1}={s}
                  </span>
                ))}
              </div>
            )}

            {getVideoKeys().map(v => {
              const done = STEPS.every(s => tracker[v.key]?.[s]);
              return (
                <div key={v.key} style={{
                  ...S.card,
                  display: "flex", alignItems: "center", gap: "12px",
                  opacity: done ? 0.6 : 1,
                  background: done ? c.greenSoft : c.bgCard,
                  flexWrap: "wrap",
                }}>
                  <div style={{ flex: 1, minWidth: "140px" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600 }}>{v.label}</div>
                    <div style={{ fontSize: "11px", color: c.textDim }}>
                      {v.account.product || "No product"} · {v.account.lang === "es" ? "ES" : "EN"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {STEPS.map((s, i) => (
                      <button
                        key={s}
                        style={S.stepDot(tracker[v.key]?.[s])}
                        onClick={() => toggleStep(v.key, s)}
                        title={s}
                      >
                        {tracker[v.key]?.[s] ? <Icons.Check /> : i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input:focus, select:focus {
          border-color: ${c.borderFocus} !important;
          box-shadow: 0 0 0 2px ${c.accent}20;
        }
        button:hover {
          filter: brightness(1.1);
        }
        button:active {
          transform: scale(0.97);
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: ${c.border};
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
