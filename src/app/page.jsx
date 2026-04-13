"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════════════════════════════════════════════════════════
   StreamDeck — Premium IPTV Player
   Netflix UI × Roku simplicity × Real Xtream Codes API
   ═══════════════════════════════════════════════════════════ */

// ─── Xtream Codes API Client ────────────────────────────────
const XtreamAPI = {
  _creds: null,
  _cache: {},

  setCreds(server, username, password) {
    // Normalize server URL
    let s = server.trim().replace(/\/+$/, "");
    if (!/^https?:\/\//i.test(s)) s = "http://" + s;
    this._creds = { server: s, username, password };
    this._cache = {};
  },

  _url(action) {
    const { server, username, password } = this._creds;
    let u = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    if (action) u += `&action=${action}`;
    return u;
  },

  async _fetch(action, cacheKey) {
    if (cacheKey && this._cache[cacheKey]) return this._cache[cacheKey];
    try {
      // Proxy API calls through our server to avoid CORS
      const rawUrl = this._url(action);
      const proxyUrl = `/api/iptv?url=${encodeURIComponent(rawUrl)}`;
      const r = await fetch(proxyUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      if (cacheKey) this._cache[cacheKey] = data;
      return data;
    } catch (e) {
      console.error("XtreamAPI error:", action, e);
      throw e;
    }
  },

  async authenticate() {
    const data = await this._fetch(null, null);
    if (data.user_info && data.user_info.auth === 1) return data;
    if (data.user_info && data.user_info.status === "Active") return data;
    throw new Error("Authentication failed");
  },

  getLiveCategories() { return this._fetch("get_live_categories", "live_cats"); },
  getLiveStreams(catId) {
    const key = catId ? `live_${catId}` : "live_all";
    const action = catId ? `get_live_streams&category_id=${catId}` : "get_live_streams";
    return this._fetch(action, key);
  },
  getVodCategories() { return this._fetch("get_vod_categories", "vod_cats"); },
  getVodStreams(catId) {
    const key = catId ? `vod_${catId}` : "vod_all";
    const action = catId ? `get_vod_streams&category_id=${catId}` : "get_vod_streams";
    return this._fetch(action, key);
  },
  getSeriesCategories() { return this._fetch("get_series_categories", "ser_cats"); },
  getSeries(catId) {
    const key = catId ? `ser_${catId}` : "ser_all";
    const action = catId ? `get_series&category_id=${catId}` : "get_series";
    return this._fetch(action, key);
  },
  getSeriesInfo(id) { return this._fetch(`get_series_info&series_id=${id}`, `serinfo_${id}`); },
  getVodInfo(id) { return this._fetch(`get_vod_info&vod_id=${id}`, `vodinfo_${id}`); },
  getEpg(streamId) { return this._fetch(`get_short_epg&stream_id=${streamId}`, `epg_${streamId}`); },

  streamUrl(type, id, ext) {
    const { server, username, password } = this._creds;
    let raw = "";
    // Live: use /live/ path with .ts extension for HLS.js
    // VOD/Series: use original container extension from the API
    if (type === "live") raw = `${server}/live/${username}/${password}/${id}.ts`;
    else if (type === "movie") raw = `${server}/movie/${username}/${password}/${id}.${ext || "mp4"}`;
    else if (type === "series") raw = `${server}/series/${username}/${password}/${id}.${ext || "mp4"}`;
    if (!raw) return "";
    // Proxy through Next.js API to avoid CORS
    return `/api/stream?url=${encodeURIComponent(raw)}`;
  },
};

// ─── Local Storage Helpers ──────────────────────────────────
const LS = {
  get(k, def = null) { try { const v = localStorage.getItem(`sd_${k}`); return v ? JSON.parse(v) : def; } catch { return def; } },
  set(k, v) { try { localStorage.setItem(`sd_${k}`, JSON.stringify(v)); } catch {} },
};

// ─── Icons (inline SVG) ────────────────────────────────────
const Icon = ({ name, size = 20, className = "" }) => {
  const s = { width: size, height: size };
  const icons = {
    home: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/></svg>,
    tv: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>,
    film: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/></svg>,
    layers: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    heart: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    heartFill: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
    clock: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    search: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
    settings: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
    play: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
    pause: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
    x: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    chevL: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
    chevR: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>,
    menu: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
    user: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    maximize: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>,
    volume: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>,
    pip: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><rect x="11" y="9" width="9" height="7" rx="1" fill="currentColor" opacity="0.3"/></svg>,
    sparkle: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></svg>,
    grid: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
    list: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
    signal: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/></svg>,
    download: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
    info: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
    logout: <svg style={s} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
    skip: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"/></svg>,
    rewind: <svg style={s} className={className} viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"/></svg>,
  };
  return icons[name] || null;
};

// ─── Utility ────────────────────────────────────────────────
const truncate = (s, n) => s && s.length > n ? s.slice(0, n) + "…" : s;
const imgFallback = (e) => { e.target.style.display = "none"; };
const fmtTime = (s) => { const m = Math.floor(s/60); const sec = Math.floor(s%60); return `${m}:${sec.toString().padStart(2,"0")}`; };

// ─── Color Palette ──────────────────────────────────────────
const C = {
  bg: "#06060e",
  surface: "#0e0e1a",
  surfaceHover: "#161628",
  card: "#12121f",
  border: "#1e1e35",
  text: "#e8e6f0",
  textMuted: "#8a88a0",
  accent: "#6d5dfc",
  accentGlow: "rgba(109,93,252,0.35)",
  accentLight: "#8b7eff",
  green: "#34d399",
  red: "#f87171",
  yellow: "#fbbf24",
  gradient: "linear-gradient(135deg, #6d5dfc 0%, #c084fc 100%)",
};

// ─── Global Styles ──────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Sans:wght@400;500;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #root { height:100%; background:${C.bg}; color:${C.text}; font-family:'DM Sans',sans-serif; overflow:hidden; }
    ::-webkit-scrollbar { width:6px; height:6px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
    ::-webkit-scrollbar-thumb:hover { background:${C.textMuted}; }
    input { font-family:inherit; }
    button { font-family:inherit; cursor:pointer; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes slideIn { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
    @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
    .animate-fade { animation: fadeIn 0.4s ease-out both; }
    .animate-slide { animation: slideIn 0.3s ease-out both; }
    .shimmer { background: linear-gradient(90deg, ${C.surface} 25%, ${C.surfaceHover} 50%, ${C.surface} 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
  `}</style>
);

// ─── Skeleton Loader ────────────────────────────────────────
const Skeleton = ({ w = "100%", h = 20, r = 8, style = {} }) => (
  <div className="shimmer" style={{ width: w, height: h, borderRadius: r, ...style }} />
);

const CardSkeleton = () => (
  <div style={{ width: 180, flexShrink: 0 }}>
    <Skeleton h={240} r={12} />
    <Skeleton w="70%" h={14} r={4} style={{ marginTop: 10 }} />
    <Skeleton w="40%" h={12} r={4} style={{ marginTop: 6 }} />
  </div>
);

// ─── Login Screen ───────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [server, setServer] = useState(LS.get("last_server", ""));
  const [user, setUser] = useState(LS.get("last_user", ""));
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const saved = LS.get("connections", []);

  const handleLogin = async () => {
    if (!server || !user || !pass) { setError("All fields required"); return; }
    setLoading(true); setError("");
    try {
      XtreamAPI.setCreds(server, user, pass);
      const data = await XtreamAPI.authenticate();
      LS.set("last_server", server);
      LS.set("last_user", user);
      // Save connection
      const conns = LS.get("connections", []);
      const exists = conns.find(c => c.server === server && c.user === user);
      if (!exists) { conns.unshift({ server, user, pass, name: data.user_info?.username || user }); LS.set("connections", conns.slice(0, 10)); }
      onLogin(data);
    } catch (e) {
      setError("Connection failed. Check your credentials and server URL.");
    }
    setLoading(false);
  };

  const loadSaved = (c) => { setServer(c.server); setUser(c.user); setPass(c.pass); };

  const inp = { width: "100%", padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, color: C.text, fontSize: 15, outline: "none", transition: "border-color 0.2s" };

  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: `radial-gradient(ellipse at 30% 20%, rgba(109,93,252,0.08) 0%, transparent 60%), ${C.bg}` }}>
      <div className="animate-fade" style={{ width: 420, padding: 48, background: C.surface, borderRadius: 24, border: `1px solid ${C.border}`, boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 60px ${C.accentGlow}` }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 42, fontFamily: "Outfit", fontWeight: 800, background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: -1 }}>StreamDeck</div>
          <div style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>Connect to your media server</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input style={inp} placeholder="Server URL (e.g. http://example.com:8080)" value={server} onChange={e => setServer(e.target.value)} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          <input style={inp} placeholder="Username" value={user} onChange={e => setUser(e.target.value)} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          <input style={inp} placeholder="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} onFocus={e => e.target.style.borderColor = C.accent} onBlur={e => e.target.style.borderColor = C.border} />
          {error && <div style={{ color: C.red, fontSize: 13, padding: "6px 0" }}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{ width: "100%", padding: "14px 0", background: loading ? C.border : C.gradient, color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 600, fontFamily: "Outfit", letterSpacing: 0.5, transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Connecting…" : "Connect"}
          </button>
        </div>
        {saved.length > 0 && (
          <div style={{ marginTop: 28, borderTop: `1px solid ${C.border}`, paddingTop: 20 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1.5 }}>Saved Connections</div>
            {saved.map((c, i) => (
              <button key={i} onClick={() => loadSaved(c)} style={{ width: "100%", padding: "10px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 13, textAlign: "left", marginBottom: 6, display: "flex", justifyContent: "space-between", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = C.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = C.card}>
                <span style={{ fontWeight: 500 }}>{c.name || c.user}</span>
                <span style={{ color: C.textMuted, fontSize: 11 }}>{c.server.replace(/^https?:\/\//, "").slice(0, 30)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Content Card ───────────────────────────────────────────
const ContentCard = ({ item, type, onClick, isFav, onFav, progress }) => {
  const [hov, setHov] = useState(false);
  const img = item.stream_icon || item.cover || "";
  const name = item.name || "Untitled";
  const rating = item.rating || null;

  return (
    <div onClick={() => onClick(item)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ width: type === "live" ? 200 : 170, flexShrink: 0, cursor: "pointer", transition: "transform 0.25s ease, box-shadow 0.25s ease", transform: hov ? "scale(1.06)" : "scale(1)", position: "relative" }}>
      <div style={{ width: "100%", aspectRatio: type === "live" ? "16/10" : "2/3", borderRadius: 14, overflow: "hidden", background: C.card, border: `1px solid ${hov ? C.accent : C.border}`, transition: "border-color 0.25s", boxShadow: hov ? `0 8px 30px rgba(0,0,0,0.4), 0 0 20px ${C.accentGlow}` : "0 4px 12px rgba(0,0,0,0.2)", position: "relative" }}>
        {img ? <img src={img} alt={name} onError={imgFallback} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /> :
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: `linear-gradient(135deg, ${C.surface} 0%, ${C.card} 100%)` }}>
            <Icon name={type === "live" ? "tv" : type === "series" ? "layers" : "film"} size={36} className="" />
          </div>}
        {hov && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", transition: "opacity 0.2s" }}><Icon name="play" size={40} /></div>}
        {progress > 0 && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "rgba(255,255,255,0.15)" }}><div style={{ height: "100%", width: `${Math.min(progress, 100)}%`, background: C.accent, borderRadius: 2 }} /></div>}
      </div>
      <div style={{ marginTop: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
          {rating && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>★ {parseFloat(rating).toFixed(1)}</div>}
        </div>
        {onFav && <button onClick={e => { e.stopPropagation(); onFav(item); }} style={{ background: "none", border: "none", color: isFav ? C.accent : C.textMuted, padding: 2, flexShrink: 0, transition: "color 0.2s" }}>
          <Icon name={isFav ? "heartFill" : "heart"} size={16} />
        </button>}
      </div>
    </div>
  );
};

// ─── Content Row ────────────────────────────────────────────
const ContentRow = ({ title, icon, items, type, onItem, favorites, onFav, watchProgress, badge }) => {
  const ref = useRef(null);
  const scroll = (dir) => { if (ref.current) ref.current.scrollBy({ left: dir * 400, behavior: "smooth" }); };
  if (!items || items.length === 0) return null;
  return (
    <div style={{ marginBottom: 32, animation: "fadeIn 0.5s ease-out both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, padding: "0 8px" }}>
        {icon && <Icon name={icon} size={18} className="" style={{ color: C.accent }} />}
        <span style={{ fontFamily: "Outfit", fontWeight: 700, fontSize: 18, letterSpacing: -0.3 }}>{title}</span>
        {badge && <span style={{ fontSize: 11, background: C.accent, color: "#fff", padding: "2px 10px", borderRadius: 20, fontWeight: 600 }}>{badge}</span>}
        <div style={{ flex: 1 }} />
        <button onClick={() => scroll(-1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, color: C.textMuted, display: "flex" }}><Icon name="chevL" size={16} /></button>
        <button onClick={() => scroll(1)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 4, color: C.textMuted, display: "flex" }}><Icon name="chevR" size={16} /></button>
      </div>
      <div ref={ref} style={{ display: "flex", gap: 16, overflowX: "auto", padding: "4px 8px 16px", scrollbarWidth: "none" }}>
        {items.slice(0, 50).map((item, i) => {
          const id = item.stream_id || item.series_id || i;
          return <ContentCard key={id} item={item} type={type} onClick={onItem} isFav={favorites?.has(String(id))} onFav={onFav} progress={watchProgress?.[id] || 0} />;
        })}
      </div>
    </div>
  );
};

// ─── Hero Banner ────────────────────────────────────────────
const HeroBanner = ({ item, type, onPlay, onInfo }) => {
  if (!item) return <Skeleton h={380} r={0} />;
  const img = item.stream_icon || item.cover || "";
  const name = item.name || "";
  const plot = item.plot || "";
  return (
    <div style={{ position: "relative", height: 400, marginBottom: 32, overflow: "hidden", borderRadius: 0 }}>
      {img && <img src={img} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "brightness(0.35) saturate(1.2)" }} onError={imgFallback} />}
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to right, ${C.bg}ee 0%, transparent 60%), linear-gradient(to top, ${C.bg} 0%, transparent 40%)` }} />
      <div className="animate-slide" style={{ position: "absolute", bottom: 48, left: 48, maxWidth: 550, zIndex: 2 }}>
        <div style={{ fontSize: 11, color: C.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="sparkle" size={14} /> Recommended For You
        </div>
        <h1 style={{ fontFamily: "Outfit", fontSize: 40, fontWeight: 800, lineHeight: 1.1, marginBottom: 12, letterSpacing: -1 }}>{truncate(name, 60)}</h1>
        {plot && <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.5, marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{plot}</p>}
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => onPlay(item)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 28px", background: C.gradient, color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, fontFamily: "Outfit", boxShadow: `0 4px 20px ${C.accentGlow}` }}>
            <Icon name="play" size={18} /> Play
          </button>
          <button onClick={() => onInfo && onInfo(item)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", background: "rgba(255,255,255,0.08)", color: C.text, border: `1px solid rgba(255,255,255,0.15)`, borderRadius: 12, fontSize: 14, fontWeight: 500, backdropFilter: "blur(10px)" }}>
            <Icon name="info" size={16} /> More Info
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Video Player ───────────────────────────────────────────
const VideoPlayer = ({ src, title, onClose, onNext, onPrev, isLive }) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null); // holds HLS or mpegts instance
  const [playing, setPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [volume, setVolume] = useState(1);
  const timerRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    const cleanup = () => {
      if (playerRef.current) {
        if (typeof playerRef.current.destroy === "function") playerRef.current.destroy();
        playerRef.current = null;
      }
    };

    const initPlayer = async () => {
      cleanup();

      const rawUrl = src.includes("/api/stream?url=") ? decodeURIComponent(src.split("url=")[1]) : src;
      const isHls = /\.m3u8(\?|$)/i.test(rawUrl);

      if (isHls) {
        // HLS streams — use HLS.js (or native on Safari/Fire TV)
        if (!window.Hls) {
          try {
            const script = document.createElement("script");
            script.src = "https://cdnjs.cloudflare.com/ajax/libs/hls.js/1.5.7/hls.min.js";
            document.head.appendChild(script);
            await new Promise((res, rej) => { script.onload = res; script.onerror = rej; });
          } catch { /* proceed without */ }
        }
        if (window.Hls && window.Hls.isSupported()) {
          const hls = new window.Hls({ enableWorker: true, lowLatencyMode: true });
          playerRef.current = hls;
          hls.loadSource(src);
          hls.attachMedia(video);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
            video.play().then(() => { video.muted = false; }).catch(() => {});
          });
          hls.on(window.Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
              else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
            }
          });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
          // Native HLS (Safari, Fire TV WebView)
          video.src = src;
          video.play().then(() => { video.muted = false; }).catch(() => {});
        }
      } else {
        // All other formats (MP4, MKV, TS, etc.) — native playback
        // Fire TV / Android handles these natively
        video.src = src;
        video.play().then(() => { video.muted = false; }).catch(() => {});
      }
    };

    initPlayer();
    return cleanup;
  }, [src]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => { setCurrentTime(v.currentTime); setDuration(v.duration || 0); };
    v.addEventListener("timeupdate", onTime);
    return () => v.removeEventListener("timeupdate", onTime);
  }, []);

  const handleMouseMove = () => {
    setShowControls(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const seek = (e) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * duration;
  };

  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (videoRef.current) await videoRef.current.requestPictureInPicture();
    } catch {}
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div onMouseMove={handleMouseMove} onClick={togglePlay} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "contain" }} playsInline muted />
      
      {/* Controls overlay */}
      <div onClick={e => e.stopPropagation()} style={{ position: "absolute", inset: 0, background: showControls ? "linear-gradient(transparent 60%, rgba(0,0,0,0.85))" : "transparent", transition: "opacity 0.3s", opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", padding: "16px 24px", gap: 16 }}>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 10, padding: 8, color: "#fff", display: "flex", backdropFilter: "blur(10px)" }}><Icon name="x" size={22} /></button>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "Outfit", fontSize: 16, fontWeight: 600 }}>{truncate(title, 60)}</div>
            {isLive && <span style={{ fontSize: 11, background: C.red, color: "#fff", padding: "2px 8px", borderRadius: 6, fontWeight: 600, marginLeft: 8 }}>LIVE</span>}
          </div>
        </div>

        {/* Bottom controls */}
        <div style={{ padding: "0 24px 20px" }}>
          {!isLive && duration > 0 && (
            <div onClick={seek} style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 3, cursor: "pointer", marginBottom: 16, position: "relative" }}>
              <div style={{ height: "100%", width: `${(currentTime / duration) * 100}%`, background: C.gradient, borderRadius: 3, transition: "width 0.1s" }} />
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {onPrev && <button onClick={onPrev} style={{ background: "none", border: "none", color: "#fff", display: "flex", padding: 4 }}><Icon name="rewind" size={22} /></button>}
            <button onClick={togglePlay} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 48, height: 48, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", backdropFilter: "blur(10px)" }}>
              <Icon name={playing ? "pause" : "play"} size={24} />
            </button>
            {onNext && <button onClick={onNext} style={{ background: "none", border: "none", color: "#fff", display: "flex", padding: 4 }}><Icon name="skip" size={22} /></button>}
            {!isLive && <span style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums" }}>{fmtTime(currentTime)} / {fmtTime(duration)}</span>}
            <div style={{ flex: 1 }} />
            <button onClick={togglePip} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", display: "flex", padding: 4 }}><Icon name="pip" size={20} /></button>
            <button onClick={toggleFullscreen} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", display: "flex", padding: 4 }}><Icon name="maximize" size={20} /></button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Category Tabs ──────────────────────────────────────────
const CategoryTabs = ({ categories, active, onSelect }) => {
  const ref = useRef(null);
  return (
    <div ref={ref} style={{ display: "flex", gap: 8, overflowX: "auto", padding: "0 8px 16px", scrollbarWidth: "none" }}>
      <button onClick={() => onSelect(null)} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${!active ? C.accent : C.border}`, background: !active ? C.accent + "22" : "transparent", color: !active ? C.accent : C.textMuted, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>All</button>
      {(categories || []).map(cat => (
        <button key={cat.category_id} onClick={() => onSelect(cat.category_id)} style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${active === cat.category_id ? C.accent : C.border}`, background: active === cat.category_id ? C.accent + "22" : "transparent", color: active === cat.category_id ? C.accent : C.textMuted, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", transition: "all 0.2s", flexShrink: 0 }}>
          {cat.category_name}
        </button>
      ))}
    </div>
  );
};

// ─── Quick Resume Bar ───────────────────────────────────────
const QuickResume = ({ item, onClick }) => {
  if (!item) return null;
  return (
    <button onClick={() => onClick(item)} style={{ position: "fixed", bottom: 20, right: 20, zIndex: 900, display: "flex", alignItems: "center", gap: 12, padding: "10px 20px 10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, color: C.text, boxShadow: `0 8px 30px rgba(0,0,0,0.5), 0 0 20px ${C.accentGlow}`, backdropFilter: "blur(20px)", animation: "scaleIn 0.3s ease-out" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="play" size={16} /></div>
      <div style={{ textAlign: "left" }}>
        <div style={{ fontSize: 11, color: C.textMuted }}>Continue Watching</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{truncate(item.name, 28)}</div>
      </div>
    </button>
  );
};

// ─── Account Info Panel ─────────────────────────────────────
const AccountPanel = ({ info, onLogout }) => {
  if (!info) return null;
  const u = info.user_info || {};
  const exp = u.exp_date ? new Date(parseInt(u.exp_date) * 1000).toLocaleDateString() : "N/A";
  const row = { display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 };
  return (
    <div className="animate-fade" style={{ maxWidth: 500, margin: "0 auto", padding: 24 }}>
      <h2 style={{ fontFamily: "Outfit", fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Account & Settings</h2>
      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={row}><span style={{ color: C.textMuted }}>Username</span><span style={{ fontWeight: 500 }}>{u.username || "—"}</span></div>
        <div style={row}><span style={{ color: C.textMuted }}>Status</span><span style={{ color: u.status === "Active" ? C.green : C.red, fontWeight: 600 }}>{u.status || "—"}</span></div>
        <div style={row}><span style={{ color: C.textMuted }}>Expires</span><span>{exp}</span></div>
        <div style={row}><span style={{ color: C.textMuted }}>Active Connections</span><span>{u.active_cons || 0} / {u.max_connections || "—"}</span></div>
        <div style={{ ...row, borderBottom: "none" }}><span style={{ color: C.textMuted }}>Created</span><span>{u.created_at || "—"}</span></div>
      </div>
      <button onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, margin: "24px auto 0", padding: "12px 28px", background: "rgba(248,113,113,0.1)", color: C.red, border: `1px solid rgba(248,113,113,0.2)`, borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
        <Icon name="logout" size={18} /> Disconnect
      </button>
    </div>
  );
};

// ─── Search Overlay ─────────────────────────────────────────
const SearchOverlay = ({ onClose, allContent, onItem }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!q || q.length < 2) return [];
    const lower = q.toLowerCase();
    return (allContent || []).filter(item => (item.name || "").toLowerCase().includes(lower)).slice(0, 30);
  }, [q, allContent]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(6,6,14,0.95)", backdropFilter: "blur(20px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 32px", borderBottom: `1px solid ${C.border}` }}>
        <Icon name="search" size={22} />
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search channels, movies, series…" style={{ flex: 1, background: "transparent", border: "none", color: C.text, fontSize: 20, fontFamily: "Outfit", fontWeight: 300, outline: "none" }} />
        <button onClick={onClose} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 8, color: C.textMuted, display: "flex" }}><Icon name="x" size={20} /></button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px" }}>
        {q.length < 2 && <div style={{ color: C.textMuted, textAlign: "center", paddingTop: 60, fontSize: 15 }}>Type to search across all content</div>}
        {q.length >= 2 && results.length === 0 && <div style={{ color: C.textMuted, textAlign: "center", paddingTop: 60, fontSize: 15 }}>No results found for "{q}"</div>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
          {results.map((item, i) => <ContentCard key={item.stream_id || item.series_id || i} item={item} type={item._type || "movie"} onClick={(it) => { onItem(it); onClose(); }} />)}
        </div>
      </div>
    </div>
  );
};

// ─── Series Detail Modal ────────────────────────────────────
const SeriesDetail = ({ series, onPlay, onClose }) => {
  const [info, setInfo] = useState(null);
  const [season, setSeason] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!series) return;
    setLoading(true);
    XtreamAPI.getSeriesInfo(series.series_id).then(data => {
      setInfo(data);
      const seasons = data.episodes ? Object.keys(data.episodes) : [];
      if (seasons.length) setSeason(seasons[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [series]);

  if (!series) return null;
  const episodes = info?.episodes?.[season] || [];
  const seasons = info?.episodes ? Object.keys(info.episodes) : [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, background: "rgba(6,6,14,0.92)", backdropFilter: "blur(20px)", overflowY: "auto" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
        <button onClick={onClose} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: C.textMuted, fontSize: 14, marginBottom: 24, padding: 0 }}><Icon name="chevL" size={18} /> Back</button>
        <div style={{ display: "flex", gap: 32, marginBottom: 32, flexWrap: "wrap" }}>
          <div style={{ width: 200, aspectRatio: "2/3", borderRadius: 16, overflow: "hidden", background: C.card, flexShrink: 0 }}>
            {series.cover ? <img src={series.cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={imgFallback} /> : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="layers" size={48} /></div>}
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 style={{ fontFamily: "Outfit", fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{series.name}</h1>
            {series.genre && <div style={{ color: C.textMuted, fontSize: 13, marginBottom: 8 }}>{series.genre}</div>}
            {series.rating && <div style={{ color: C.yellow, fontSize: 14, marginBottom: 12 }}>★ {parseFloat(series.rating).toFixed(1)}</div>}
            {(series.plot || info?.info?.plot) && <p style={{ color: C.textMuted, fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>{truncate(series.plot || info?.info?.plot, 300)}</p>}
            {series.cast && <div style={{ fontSize: 13, color: C.textMuted }}>Cast: {truncate(series.cast, 100)}</div>}
          </div>
        </div>

        {loading ? <div style={{ display: "flex", gap: 12 }}>{[1,2,3].map(i => <Skeleton key={i} w={80} h={36} r={10} />)}</div> : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
              {seasons.map(s => (
                <button key={s} onClick={() => setSeason(s)} style={{ padding: "8px 18px", borderRadius: 12, border: `1px solid ${season === s ? C.accent : C.border}`, background: season === s ? C.accent + "22" : "transparent", color: season === s ? C.accent : C.textMuted, fontSize: 13, fontWeight: 600 }}>
                  Season {s}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {episodes.map((ep, i) => (
                <button key={ep.id || i} onClick={() => onPlay(ep, series)} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, color: C.text, textAlign: "left", transition: "all 0.2s", width: "100%" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.surfaceHover; e.currentTarget.style.borderColor = C.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="play" size={16} /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Episode {ep.episode_num || i + 1}{ep.title ? `: ${ep.title}` : ""}</div>
                    {ep.info?.plot && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ep.info.plot}</div>}
                  </div>
                  {ep.info?.duration && <span style={{ fontSize: 12, color: C.textMuted, flexShrink: 0 }}>{ep.info.duration}</span>}
                </button>
              ))}
              {episodes.length === 0 && <div style={{ color: C.textMuted, padding: 24, textAlign: "center" }}>No episodes found for this season</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// ─── MAIN APP ─────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
export default function StreamDeck() {
  // Auth state
  const [authed, setAuthed] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);

  // Navigation
  const [page, setPage] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Data
  const [liveCats, setLiveCats] = useState([]);
  const [liveStreams, setLiveStreams] = useState([]);
  const [vodCats, setVodCats] = useState([]);
  const [vodStreams, setVodStreams] = useState([]);
  const [seriesCats, setSeriesCats] = useState([]);
  const [seriesList, setSeriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [liveCatFilter, setLiveCatFilter] = useState(null);
  const [vodCatFilter, setVodCatFilter] = useState(null);
  const [seriesCatFilter, setSeriesCatFilter] = useState(null);

  // Player
  const [playerSrc, setPlayerSrc] = useState(null);
  const [playerTitle, setPlayerTitle] = useState("");
  const [playerIsLive, setPlayerIsLive] = useState(false);

  // Favorites
  const [favorites, setFavorites] = useState(new Set(LS.get("favorites", [])));

  // Watch progress
  const [watchProgress, setWatchProgress] = useState(LS.get("watchProgress", {}));
  const [lastWatched, setLastWatched] = useState(LS.get("lastWatched", null));

  // Search
  const [searchOpen, setSearchOpen] = useState(false);

  // Series detail
  const [selectedSeries, setSelectedSeries] = useState(null);

  // Viewing stats
  const [watchTime, setWatchTime] = useState(LS.get("watchTime", 0));

  // ─── Load data after auth ─────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [lc, ls, vc, vs, sc, ss] = await Promise.all([
        XtreamAPI.getLiveCategories().catch(() => []),
        XtreamAPI.getLiveStreams().catch(() => []),
        XtreamAPI.getVodCategories().catch(() => []),
        XtreamAPI.getVodStreams().catch(() => []),
        XtreamAPI.getSeriesCategories().catch(() => []),
        XtreamAPI.getSeries().catch(() => []),
      ]);
      setLiveCats(lc || []); setLiveStreams(ls || []);
      setVodCats(vc || []); setVodStreams(vs || []);
      setSeriesCats(sc || []); setSeriesList(ss || []);
    } catch (e) { console.error("Data load error:", e); }
    setLoading(false);
  }, []);

  const handleLogin = (data) => {
    setAccountInfo(data);
    setAuthed(true);
    loadData();
  };

  // ─── Favorites ────────────────────────────────────────────
  const toggleFav = (item) => {
    const id = String(item.stream_id || item.series_id);
    setFavorites(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      LS.set("favorites", [...n]);
      return n;
    });
  };

  // ─── Play handlers ────────────────────────────────────────
  const playLive = (item) => {
    const url = XtreamAPI.streamUrl("live", item.stream_id);
    setPlayerSrc(url); setPlayerTitle(item.name); setPlayerIsLive(true);
    setLastWatched({ ...item, _type: "live" }); LS.set("lastWatched", { ...item, _type: "live" });
  };

  const playVod = (item) => {
    const url = XtreamAPI.streamUrl("movie", item.stream_id, item.container_extension);
    setPlayerSrc(url); setPlayerTitle(item.name); setPlayerIsLive(false);
    setLastWatched({ ...item, _type: "movie" }); LS.set("lastWatched", { ...item, _type: "movie" });
  };

  const playEpisode = (ep, series) => {
    const url = XtreamAPI.streamUrl("series", ep.id, ep.container_extension);
    const title = `${series.name} — S${ep.season || "?"}E${ep.episode_num || "?"}`;
    setPlayerSrc(url); setPlayerTitle(title); setPlayerIsLive(false);
    setSelectedSeries(null);
    setLastWatched({ name: title, _type: "series", stream_id: ep.id }); LS.set("lastWatched", { name: title, _type: "series", stream_id: ep.id });
  };

  const handleItemClick = (item) => {
    if (item._type === "live" || item.epg_channel_id !== undefined) playLive(item);
    else if (item._type === "series" || item.series_id) setSelectedSeries(item);
    else playVod(item);
  };

  const closePlayer = () => { setPlayerSrc(null); };

  const handleLogout = () => {
    setAuthed(false); setAccountInfo(null);
    XtreamAPI._creds = null; XtreamAPI._cache = {};
    setLiveStreams([]); setVodStreams([]); setSeriesList([]);
    setPage("home");
  };

  // ─── Filtered data ────────────────────────────────────────
  const filteredLive = useMemo(() => {
    if (!liveCatFilter) return liveStreams;
    return liveStreams.filter(s => String(s.category_id) === String(liveCatFilter));
  }, [liveStreams, liveCatFilter]);

  const filteredVod = useMemo(() => {
    if (!vodCatFilter) return vodStreams;
    return vodStreams.filter(s => String(s.category_id) === String(vodCatFilter));
  }, [vodStreams, vodCatFilter]);

  const filteredSeries = useMemo(() => {
    if (!seriesCatFilter) return seriesList;
    return seriesList.filter(s => String(s.category_id) === String(seriesCatFilter));
  }, [seriesList, seriesCatFilter]);

  // ─── "AI Picks" — smart recommendations ───────────────────
  const aiPicks = useMemo(() => {
    const hour = new Date().getHours();
    let picks = [];
    // Evening/night: promote movies and series
    if (hour >= 18 || hour < 6) {
      picks = [...vodStreams.filter(v => parseFloat(v.rating) >= 6).slice(0, 10), ...seriesList.filter(s => parseFloat(s.rating) >= 6).slice(0, 10)];
    } else {
      // Daytime: mix of live and VOD
      picks = [...liveStreams.slice(0, 10), ...vodStreams.slice(-10)];
    }
    // Shuffle
    for (let i = picks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [picks[i], picks[j]] = [picks[j], picks[i]]; }
    return picks.slice(0, 20);
  }, [liveStreams, vodStreams, seriesList]);

  // All content for search
  const allContent = useMemo(() => [
    ...liveStreams.map(s => ({ ...s, _type: "live" })),
    ...vodStreams.map(s => ({ ...s, _type: "movie" })),
    ...seriesList.map(s => ({ ...s, _type: "series" })),
  ], [liveStreams, vodStreams, seriesList]);

  // Fav items
  const favItems = useMemo(() => allContent.filter(item => favorites.has(String(item.stream_id || item.series_id))), [allContent, favorites]);
  const favLiveChannels = useMemo(() => liveStreams.filter(s => favorites.has(String(s.stream_id))).slice(0, 6), [liveStreams, favorites]);

  // Hero item
  const heroItem = useMemo(() => {
    const pool = [...vodStreams.filter(v => v.stream_icon || v.cover), ...seriesList.filter(s => s.cover)];
    return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }, [vodStreams, seriesList]);

  // ─── Keyboard shortcut ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "/" && !searchOpen && !playerSrc) { e.preventDefault(); setSearchOpen(true); }
      if (e.key === "Escape") { if (searchOpen) setSearchOpen(false); if (selectedSeries) setSelectedSeries(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, playerSrc, selectedSeries]);

  // ─── If not authed, show login ────────────────────────────
  if (!authed) return <><GlobalStyle /><LoginScreen onLogin={handleLogin} /></>;

  // ─── Navigation items ─────────────────────────────────────
  const navItems = [
    { id: "home", icon: "home", label: "Home" },
    { id: "live", icon: "tv", label: "Live TV" },
    { id: "movies", icon: "film", label: "Movies" },
    { id: "series", icon: "layers", label: "Series" },
    { id: "favorites", icon: "heart", label: "Favorites" },
    { id: "settings", icon: "settings", label: "Settings" },
  ];

  // ─── Page Content ─────────────────────────────────────────
  const renderPage = () => {
    if (loading) return (
      <div style={{ padding: 32 }}>
        <Skeleton w="30%" h={28} r={8} style={{ marginBottom: 32 }} />
        <div style={{ display: "flex", gap: 16, marginBottom: 40 }}>{[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}</div>
        <Skeleton w="25%" h={28} r={8} style={{ marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 16 }}>{[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}</div>
      </div>
    );

    switch (page) {
      case "home":
        return (
          <div>
            <HeroBanner item={heroItem} type="movie" onPlay={handleItemClick} />
            <div style={{ padding: "0 16px" }}>
              {favLiveChannels.length > 0 && <ContentRow title="My Channels" icon="heartFill" items={favLiveChannels} type="live" onItem={playLive} favorites={favorites} onFav={toggleFav} />}
              {aiPicks.length > 0 && <ContentRow title="Recommended For You" icon="sparkle" badge="AI" items={aiPicks} type="movie" onItem={handleItemClick} favorites={favorites} onFav={toggleFav} />}
              <ContentRow title="Live TV" icon="tv" items={liveStreams.slice(0, 30)} type="live" onItem={playLive} favorites={favorites} onFav={toggleFav} />
              <ContentRow title="Recently Added Movies" icon="film" items={[...vodStreams].sort((a,b) => (b.added || 0) - (a.added || 0)).slice(0, 30)} type="movie" onItem={playVod} favorites={favorites} onFav={toggleFav} />
              <ContentRow title="Top Rated Movies" icon="sparkle" items={[...vodStreams].sort((a,b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)).slice(0, 30)} type="movie" onItem={playVod} favorites={favorites} onFav={toggleFav} />
              <ContentRow title="Series" icon="layers" items={seriesList.slice(0, 30)} type="series" onItem={(item) => setSelectedSeries(item)} favorites={favorites} onFav={toggleFav} />
            </div>
          </div>
        );
      case "live":
        return (
          <div style={{ padding: "24px 16px" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}><Icon name="tv" size={26} /> Live TV <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>({filteredLive.length} channels)</span></h2>
            <CategoryTabs categories={liveCats} active={liveCatFilter} onSelect={setLiveCatFilter} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {filteredLive.slice(0, 200).map((item, i) => <ContentCard key={item.stream_id || i} item={item} type="live" onClick={playLive} isFav={favorites.has(String(item.stream_id))} onFav={toggleFav} />)}
            </div>
            {filteredLive.length === 0 && <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No channels in this category</div>}
          </div>
        );
      case "movies":
        return (
          <div style={{ padding: "24px 16px" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}><Icon name="film" size={26} /> Movies <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>({filteredVod.length})</span></h2>
            <CategoryTabs categories={vodCats} active={vodCatFilter} onSelect={setVodCatFilter} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
              {filteredVod.slice(0, 200).map((item, i) => <ContentCard key={item.stream_id || i} item={item} type="movie" onClick={playVod} isFav={favorites.has(String(item.stream_id))} onFav={toggleFav} />)}
            </div>
            {filteredVod.length === 0 && <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No movies in this category</div>}
          </div>
        );
      case "series":
        return (
          <div style={{ padding: "24px 16px" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}><Icon name="layers" size={26} /> Series <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>({filteredSeries.length})</span></h2>
            <CategoryTabs categories={seriesCats} active={seriesCatFilter} onSelect={setSeriesCatFilter} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
              {filteredSeries.slice(0, 200).map((item, i) => <ContentCard key={item.series_id || i} item={item} type="series" onClick={(it) => setSelectedSeries(it)} isFav={favorites.has(String(item.series_id))} onFav={toggleFav} />)}
            </div>
            {filteredSeries.length === 0 && <div style={{ color: C.textMuted, textAlign: "center", padding: 60 }}>No series in this category</div>}
          </div>
        );
      case "favorites":
        return (
          <div style={{ padding: "24px 16px" }}>
            <h2 style={{ fontFamily: "Outfit", fontSize: 28, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}><Icon name="heart" size={26} /> Favorites <span style={{ fontSize: 14, color: C.textMuted, fontWeight: 400 }}>({favItems.length})</span></h2>
            {favItems.length === 0 ? (
              <div style={{ textAlign: "center", padding: 80, color: C.textMuted }}>
                <Icon name="heart" size={48} />
                <p style={{ marginTop: 16, fontSize: 16 }}>No favorites yet. Click the heart icon on any content to save it here.</p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 16 }}>
                {favItems.map((item, i) => <ContentCard key={item.stream_id || item.series_id || i} item={item} type={item._type || "movie"} onClick={handleItemClick} isFav={true} onFav={toggleFav} />)}
              </div>
            )}
          </div>
        );
      case "settings":
        return <AccountPanel info={accountInfo} onLogout={handleLogout} />;
      default:
        return null;
    }
  };

  return (
    <>
      <GlobalStyle />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* ─── Sidebar ─────────────────────────────────── */}
        <div style={{ width: sidebarOpen ? 220 : 68, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", transition: "width 0.25s ease", flexShrink: 0, overflow: "hidden" }}>
          {/* Logo */}
          <div style={{ padding: sidebarOpen ? "20px 20px 8px" : "20px 14px 8px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setSidebarOpen(!sidebarOpen)}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: C.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `0 4px 12px ${C.accentGlow}` }}>
              <Icon name="play" size={18} />
            </div>
            {sidebarOpen && <span style={{ fontFamily: "Outfit", fontWeight: 800, fontSize: 20, letterSpacing: -0.5, background: C.gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>StreamDeck</span>}
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: "16px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map(item => {
              const active = page === item.id;
              return (
                <button key={item.id} onClick={() => setPage(item.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: sidebarOpen ? "10px 14px" : "10px 14px", background: active ? C.accent + "18" : "transparent", border: "none", borderRadius: 12, color: active ? C.accent : C.textMuted, fontSize: 14, fontWeight: active ? 600 : 400, transition: "all 0.2s", width: "100%", justifyContent: sidebarOpen ? "flex-start" : "center" }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.surfaceHover; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                  <Icon name={item.icon} size={20} />
                  {sidebarOpen && <span>{item.label}</span>}
                  {item.id === "favorites" && favItems.length > 0 && sidebarOpen && <span style={{ marginLeft: "auto", fontSize: 11, background: C.accent + "33", color: C.accent, padding: "2px 8px", borderRadius: 10 }}>{favItems.length}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          {sidebarOpen && (
            <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.green }} />
                Connected
              </div>
            </div>
          )}
        </div>

        {/* ─── Main Content ────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", padding: "12px 24px", gap: 16, borderBottom: `1px solid ${C.border}`, background: C.surface, flexShrink: 0 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: C.textMuted, display: "flex", padding: 4 }}><Icon name="menu" size={20} /></button>
            <div style={{ flex: 1 }} />
            <button onClick={() => setSearchOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, color: C.textMuted, fontSize: 13, transition: "border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = C.accent} onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
              <Icon name="search" size={16} /> Search <span style={{ fontSize: 11, opacity: 0.5, marginLeft: 8 }}>/</span>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => setPage("settings")}>
              <Icon name="user" size={18} />
              {accountInfo?.user_info?.username && <span style={{ fontSize: 13, fontWeight: 500 }}>{accountInfo.user_info.username}</span>}
            </div>
          </div>

          {/* Page */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {renderPage()}
          </div>
        </div>
      </div>

      {/* ─── Overlays ──────────────────────────────────── */}
      {playerSrc && <VideoPlayer src={playerSrc} title={playerTitle} isLive={playerIsLive} onClose={closePlayer} />}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} allContent={allContent} onItem={handleItemClick} />}
      {selectedSeries && <SeriesDetail series={selectedSeries} onPlay={playEpisode} onClose={() => setSelectedSeries(null)} />}
      {!playerSrc && lastWatched && page === "home" && <QuickResume item={lastWatched} onClick={handleItemClick} />}
    </>
  );
}
