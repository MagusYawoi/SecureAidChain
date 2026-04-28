import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFraudAlerts, getFraudStats, simulateFraud, reviewFraudAlert } from "../services/api";
import toast from "react-hot-toast";

const RISK_STYLE = {
  critical: { color: "#f87171", dot: "#ef4444" },
  high:     { color: "#fbbf24", dot: "#f59e0b" },
  medium:   { color: "#00d4ff", dot: "#00d4ff" },
  low:      { color: "#34d399", dot: "#10b981" },
};
const STATUS_STYLE = {
  flagged:         { color: "#fbbf24", label: "Flagged" },
  reviewed:        { color: "#00d4ff", label: "Reviewed" },
  dismissed:       { color: "#6b7280", label: "Dismissed" },
  confirmed_fraud: { color: "#f87171", label: "Confirmed Fraud" },
};
const SCENARIOS = [
  { id: "large_amount",       label: "💰 Large Amount",       desc: "150 ETH donation — triggers threshold rule" },
  { id: "rapid_fire",         label: "⚡ Rapid Fire",         desc: "Same address spamming transactions" },
  { id: "self_transfer",      label: "🔄 Self Transfer",      desc: "Sender = recipient — circular funds" },
  { id: "dust_attack",        label: "🌫 Dust Attack",        desc: "0.0001 ETH — address probing" },
  { id: "large_disbursement", label: "🏦 Large Disbursement", desc: "80 ETH disbursement — unauthorized scale" },
];
const CHART_COLORS = {
  critical: "#ef4444",
  high:     "#f59e0b",
  medium:   "#00d4ff",
  low:      "#10b981",
};

// ─── Pure SVG Pie Chart ───────────────────────────────────────────────────────
function PieChart({ data }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const r = 80;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart label="No data yet — simulate some attacks!" />;

  let angle = -90;
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const start = angle;
    angle += pct * 360;
    const end = angle;
    const startRad = (start * Math.PI) / 180;
    const endRad   = (end   * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = pct > 0.5 ? 1 : 0;
    const midRad = ((start + end) / 2 * Math.PI) / 180;
    return { ...d, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`, pct, midRad };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--bg)" strokeWidth={2}>
            <title>{s.label}: {s.value} ({(s.pct * 100).toFixed(1)}%)</title>
          </path>
        ))}
        <circle cx={cx} cy={cy} r={42} fill="var(--surface2)" />
        <text x={cx} y={cy - 8} textAnchor="middle" fill="var(--text)" fontSize={20} fontWeight={700}>{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#6b7280" fontSize={10}>TOTAL</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{s.label}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: s.color, fontWeight: 600, marginLeft: "auto", paddingLeft: 12 }}>
              {s.value} <span style={{ color: "#6b7280", fontWeight: 400 }}>({(s.pct * 100).toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pure SVG Bar Chart ───────────────────────────────────────────────────────
function BarChart({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart label="No data yet — simulate some attacks!" />;
  const max = Math.max(...data.map(d => d.value), 1);
  const W = 380, H = 180, pad = { top: 16, bottom: 40, left: 36, right: 16 };
  const bw = (W - pad.left - pad.right) / data.length;
  const barW = bw * 0.55;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
      {/* Y gridlines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const y = pad.top + (1 - f) * (H - pad.top - pad.bottom);
        const val = Math.round(f * max);
        return (
          <g key={f}>
            <line x1={pad.left} y1={y} x2={W - pad.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
            <text x={pad.left - 6} y={y + 4} textAnchor="end" fill="#6b7280" fontSize={9}>{val}</text>
          </g>
        );
      })}
      {/* Bars */}
      {data.map((d, i) => {
        const barH = d.value > 0 ? ((d.value / max) * (H - pad.top - pad.bottom)) : 2;
        const x = pad.left + i * bw + (bw - barW) / 2;
        const y = pad.top + (H - pad.top - pad.bottom) - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85} />
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fill={d.color} fontSize={10} fontWeight={700}>{d.value}</text>
            )}
            <text x={x + barW / 2} y={H - pad.bottom + 14} textAnchor="middle" fill="#6b7280" fontSize={9}>{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ data }) {
  const size = 200;
  const cx = size / 2, cy = size / 2;
  const rOuter = 85, rInner = 55;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart label="No data yet — simulate some attacks!" />;

  let angle = -90;
  const slices = data.filter(d => d.value > 0).map(d => {
    const pct = d.value / total;
    const start = angle;
    angle += pct * 360;
    const toRad = deg => (deg * Math.PI) / 180;
    const x1o = cx + rOuter * Math.cos(toRad(start));
    const y1o = cy + rOuter * Math.sin(toRad(start));
    const x2o = cx + rOuter * Math.cos(toRad(angle));
    const y2o = cy + rOuter * Math.sin(toRad(angle));
    const x1i = cx + rInner * Math.cos(toRad(angle));
    const y1i = cy + rInner * Math.sin(toRad(angle));
    const x2i = cx + rInner * Math.cos(toRad(start));
    const y2i = cy + rInner * Math.sin(toRad(start));
    const large = pct > 0.5 ? 1 : 0;
    const path = `M${x1o},${y1o} A${rOuter},${rOuter} 0 ${large},1 ${x2o},${y2o} L${x1i},${y1i} A${rInner},${rInner} 0 ${large},0 ${x2i},${y2i} Z`;
    return { ...d, path, pct };
  });

  const topSlice = [...data].sort((a, b) => b.value - a.value)[0];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--bg)" strokeWidth={2}>
            <title>{s.label}: {s.value}</title>
          </path>
        ))}
        <text x={cx} y={cy - 10} textAnchor="middle" fill={topSlice?.color || "var(--text)"} fontSize={11} fontWeight={700} textTransform="uppercase">
          {topSlice?.label || ""}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="var(--text)" fontSize={22} fontWeight={800}>{topSlice?.value || 0}</text>
        <text x={cx} y={cy + 22} textAnchor="middle" fill="#6b7280" fontSize={9}>highest</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{d.label}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: d.color, fontWeight: 600, marginLeft: "auto", paddingLeft: 12 }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Horizontal Bar ───────────────────────────────────────────────────────────
function HorizontalBar({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart label="No data yet — simulate some attacks!" />;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>{d.label}</span>
            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: d.color, fontWeight: 700 }}>
              {d.value} <span style={{ color: "#6b7280", fontWeight: 400 }}>({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
            </span>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 6, height: 10, overflow: "hidden" }}>
            <div style={{
              width: `${(d.value / max) * 100}%`,
              height: "100%",
              background: d.color,
              borderRadius: 6,
              transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
              boxShadow: `0 0 8px ${d.color}60`
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyChart({ label }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-muted)" }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>📊</div>
      <p style={{ fontSize: 13 }}>{label}</p>
    </div>
  );
}

// ─── Visualization Panel ──────────────────────────────────────────────────────
function FraudVisualizations({ stats }) {
  const [chartType, setChartType] = useState("pie");

  const riskData = [
    { label: "Critical", value: stats.critical || 0, color: CHART_COLORS.critical },
    { label: "High",     value: stats.high     || 0, color: CHART_COLORS.high },
    { label: "Medium",   value: stats.medium   || 0, color: CHART_COLORS.medium },
    { label: "Low",      value: stats.low      || 0, color: CHART_COLORS.low },
  ];

  const CHART_OPTIONS = [
    { id: "pie",   label: "🥧 Pie",        desc: "Distribution by risk level" },
    { id: "donut", label: "🍩 Donut",      desc: "Donut with highest risk" },
    { id: "bar",   label: "📊 Bar",        desc: "Count per risk level" },
    { id: "hbar",  label: "📉 Horizontal", desc: "Horizontal progress bars" },
  ];

  const renderChart = () => {
    if (chartType === "pie")   return <PieChart data={riskData} />;
    if (chartType === "donut") return <DonutChart data={riskData} />;
    if (chartType === "bar")   return <BarChart data={riskData} />;
    if (chartType === "hbar")  return <HorizontalBar data={riskData} />;
    return null;
  };

  return (
    <div className="card-glow fade-up" style={{ padding: 28, marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title" style={{ margin: 0 }}>📊 Fraud Analytics</p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Visual breakdown of fraud alerts by severity</p>
        </div>
        {/* Chart type selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHART_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setChartType(opt.id)}
              title={opt.desc}
              style={{
                padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: "pointer", transition: "all 0.2s", fontFamily: "'Syne', sans-serif",
                background: chartType === opt.id ? "rgba(0,212,255,0.15)" : "var(--surface2)",
                color: chartType === opt.id ? "var(--accent)" : "var(--text-muted)",
                border: chartType === opt.id ? "1px solid rgba(0,212,255,0.4)" : "1px solid var(--border)",
                boxShadow: chartType === opt.id ? "0 0 12px rgba(0,212,255,0.15)" : "none",
              }}
            >{opt.label}</button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div style={{
        minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px 8px",
      }}>
        {renderChart()}
      </div>

      {/* Summary row */}
      <div style={{
        display: "flex", gap: 0, marginTop: 20,
        borderTop: "1px solid var(--border)", paddingTop: 16, flexWrap: "wrap"
      }}>
        {riskData.map((d, i) => (
          <div key={i} style={{
            flex: "1 1 80px", textAlign: "center", padding: "8px 4px",
            borderRight: i < riskData.length - 1 ? "1px solid var(--border)" : "none"
          }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 800, color: d.color }}>{d.value}</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px", marginTop: 2 }}>{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FraudDashboard() {
  const [alerts, setAlerts]         = useState([]);
  const [stats, setStats]           = useState({});
  const [filter, setFilter]         = useState({ status: "", riskLevel: "" });
  const [loading, setLoading]       = useState(true);
  const [simulating, setSimulating] = useState("");
  const [selected, setSelected]     = useState(null);
  const [reviewNote, setReviewNote] = useState("");

  const fetchData = async () => {
    try {
      const params = {};
      if (filter.status)    params.status    = filter.status;
      if (filter.riskLevel) params.riskLevel = filter.riskLevel;
      const [a, s] = await Promise.all([
        getFraudAlerts(params),
        getFraudStats(),
      ]);
      setAlerts(a.data);
      setStats(s.data);
    } catch {
      toast.error("Failed to load fraud data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const simulate = async (scenario) => {
    setSimulating(scenario);
    try {
      const { data } = await simulateFraud(scenario, "flood-2024-01");
      toast.success(`🚨 Alert generated! Risk: ${data.alert?.riskLevel?.toUpperCase()}`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Simulation failed");
    } finally {
      setSimulating("");
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await reviewFraudAlert(id, { status, reviewNote });
      toast.success("Alert updated");
      setSelected(null);
      setReviewNote("");
      fetchData();
    } catch {
      toast.error("Update failed");
    }
  };

  const rs = (level) => RISK_STYLE[level] || RISK_STYLE.low;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #ef4444, #f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🚨</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.5px", background: "linear-gradient(135deg, #f87171, #fbbf24)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Fraud Detection
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link to="/dashboard" className="nav-link">← Dashboard</Link>
          <Link to="/admin" className="nav-link">Admin</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>

        {/* Page header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#f87171", marginBottom: 8 }}>AI-Powered Security</p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 8 }}>Fraud Detection System</h1>
          <p style={{ fontSize: 14, color: "var(--text-muted)" }}>Real-time analysis of every transaction using 7 detection rules</p>
        </div>

        {/* Stats cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Total Alerts",    value: stats.total     || 0, color: "var(--text)" },
            { label: "Critical",        value: stats.critical  || 0, color: "#f87171" },
            { label: "High Risk",       value: stats.high      || 0, color: "#fbbf24" },
            { label: "Medium",          value: stats.medium    || 0, color: "#00d4ff" },
            { label: "Flagged",         value: stats.flagged   || 0, color: "#fbbf24" },
            { label: "Confirmed Fraud", value: stats.confirmed || 0, color: "#f87171" },
          ].map((s, i) => (
            <div key={s.label} className={`stat-card fade-up fade-up-${i + 1}`} style={{ padding: 20 }}>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── VISUALIZATION PANEL ── */}
        <FraudVisualizations stats={stats} />

        {/* Two columns: Simulate + Rules */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 24, marginBottom: 32 }}>

          {/* Simulate */}
          <div className="card-glow fade-up fade-up-2" style={{ padding: 28 }}>
            <p className="section-title">🧪 Simulate Attack Scenarios</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20, lineHeight: 1.6 }}>
              Trigger fake suspicious transactions to demonstrate fraud detection live.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => simulate(s.id)} disabled={!!simulating}
                  style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: "var(--radius)", padding: "14px 16px",
                    cursor: simulating ? "not-allowed" : "pointer",
                    textAlign: "left", transition: "all 0.2s",
                    opacity: simulating && simulating !== s.id ? 0.5 : 1
                  }}
                  onMouseEnter={e => { if (!simulating) e.currentTarget.style.borderColor = "rgba(239,68,68,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                    {simulating === s.id ? "⏳ Analyzing..." : s.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Detection Rules */}
          <div className="card-glow fade-up fade-up-3" style={{ padding: 28 }}>
            <p className="section-title">🛡 Active Detection Rules</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { rule: "Large Amount",       desc: "Flags donations > 50 ETH",           score: "+20–40 pts", color: "#f87171" },
                { rule: "Rapid Fire",         desc: "3+ transactions in 10 minutes",       score: "+25–50 pts", color: "#fbbf24" },
                { rule: "Round Amount",       desc: "Exact round numbers ≥ 10 ETH",        score: "+15 pts",    color: "#00d4ff" },
                { rule: "Duplicate Disaster", desc: "Same address, same campaign, 1 hour", score: "+15–35 pts", color: "#a78bfa" },
                { rule: "Zero / Dust",        desc: "Amount ≤ 0.001 ETH (probing)",        score: "+30–60 pts", color: "#f87171" },
                { rule: "Suspicious Address", desc: "Null address or self-transfer",       score: "+70–90 pts", color: "#f87171" },
                { rule: "Large Disbursement", desc: "Disbursement > 50 ETH",               score: "+45 pts",    color: "#fbbf24" },
              ].map((r) => (
                <div key={r.rule} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", borderRadius: "var(--radius)",
                  background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)"
                }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{r.rule}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.desc}</div>
                  </div>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: r.color, fontWeight: 600, whiteSpace: "nowrap", marginLeft: 12 }}>{r.score}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: "var(--radius)", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
              <div style={{ fontSize: 11, color: "#f87171", fontWeight: 700, marginBottom: 8, letterSpacing: "1px", textTransform: "uppercase" }}>Risk Score Scale</div>
              <div style={{ display: "flex", gap: 20 }}>
                {[["0–19","Low","#34d399"],["20–39","Medium","#00d4ff"],["40–69","High","#fbbf24"],["70–100","Critical","#f87171"]].map(([range, level, color]) => (
                  <div key={level} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color, marginBottom: 2 }}>{level}</div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "var(--text-muted)" }}>{range}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="card-glow fade-up fade-up-4" style={{ padding: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <p className="section-title" style={{ margin: 0 }}>🚨 Fraud Alerts ({alerts.length})</p>
            <div style={{ display: "flex", gap: 10 }}>
              <select value={filter.riskLevel} onChange={(e) => setFilter({ ...filter, riskLevel: e.target.value })}
                className="input-field" style={{ width: "auto", fontSize: 12, padding: "6px 12px" }}>
                <option value="">All Risk</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="input-field" style={{ width: "auto", fontSize: 12, padding: "6px 12px" }}>
                <option value="">All Status</option>
                <option value="flagged">Flagged</option>
                <option value="reviewed">Reviewed</option>
                <option value="dismissed">Dismissed</option>
                <option value="confirmed_fraud">Confirmed Fraud</option>
              </select>
              <button onClick={fetchData} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>↻ Refresh</button>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>Loading...</div>
          ) : alerts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No fraud alerts — system is clean</p>
              <p style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>Use the simulator above to generate test alerts</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="data-table">
                <thead><tr>
                  <th>Risk</th><th>Score</th><th>Type</th><th>Amount</th><th>From Address</th><th>Flags</th><th>Status</th><th>Time</th><th></th>
                </tr></thead>
                <tbody>
                  {alerts.map((a) => {
                    const r = rs(a.riskLevel);
                    const st = STATUS_STYLE[a.status] || STATUS_STYLE.flagged;
                    return (
                      <tr key={a._id}>
                        <td>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.dot, boxShadow: `0 0 6px ${r.dot}`, flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: r.color }}>{a.riskLevel}</span>
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: "'DM Mono',monospace", fontWeight: 700, color: r.color }}>{a.riskScore}</span>
                          <span style={{ fontSize: 10, color: "var(--text-dim)" }}>/100</span>
                        </td>
                        <td><span style={{ textTransform: "capitalize", color: "var(--text)" }}>{a.type}</span></td>
                        <td style={{ fontFamily: "'DM Mono',monospace", color: "#00d4ff", fontWeight: 500 }}>{a.amount} ETH</td>
                        <td style={{ fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{a.fromAddress.slice(0, 12)}...</td>
                        <td style={{ maxWidth: 200 }}>
                          {a.flags.slice(0, 2).map((f, i) => (
                            <div key={i} style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.5 }}>• {f.slice(0, 45)}{f.length > 45 ? "..." : ""}</div>
                          ))}
                          {a.flags.length > 2 && <div style={{ fontSize: 10, color: "var(--text-dim)" }}>+{a.flags.length - 2} more</div>}
                        </td>
                        <td><span style={{ fontSize: 11, fontWeight: 600, color: st.color }}>{st.label}</span></td>
                        <td style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(a.createdAt).toLocaleString()}</td>
                        <td>
                          <button onClick={() => setSelected(a)} className="btn-accent" style={{ padding: "5px 12px", fontSize: 11 }}>Review</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Review Modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, overflowY: "auto" }}
          onClick={() => setSelected(null)}>
          <div className="glass" style={{ maxWidth: 620, width: "100%", padding: 32, margin: "auto" }} onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>🚨 Fraud Alert Investigation</h3>
                <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono',monospace" }}>
                  {selected.txHash.slice(0, 20)}...
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>

            {/* Severity banner */}
            <div style={{
              padding: "12px 16px", borderRadius: "var(--radius)", marginBottom: 20,
              background: selected.riskLevel === "critical" ? "rgba(239,68,68,0.12)" :
                          selected.riskLevel === "high"     ? "rgba(245,158,11,0.12)" :
                          selected.riskLevel === "medium"   ? "rgba(0,212,255,0.12)"  : "rgba(16,185,129,0.12)",
              border: `1px solid ${selected.riskLevel === "critical" ? "rgba(239,68,68,0.3)" :
                                   selected.riskLevel === "high"     ? "rgba(245,158,11,0.3)" :
                                   selected.riskLevel === "medium"   ? "rgba(0,212,255,0.3)"  : "rgba(16,185,129,0.3)"}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color:
                selected.riskLevel === "critical" ? "#f87171" :
                selected.riskLevel === "high"     ? "#fbbf24" :
                selected.riskLevel === "medium"   ? "#00d4ff" : "#34d399"
              }}>
                {selected.attackMetadata?.severity || selected.riskLevel.toUpperCase()}
              </div>
              {selected.attackMetadata?.attackPattern && (
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Pattern: {selected.attackMetadata.attackPattern}
                </div>
              )}
            </div>

            {/* Key info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
              {[
                ["Risk Score",   `${selected.riskScore}/100`],
                ["Amount",       `${selected.amount} ETH`],
                ["Type",         selected.type],
                ["Disaster",     selected.disasterId],
                ["Rules Hit",    `${selected.attackMetadata?.rulesTriggered || selected.flags?.length || 0} rules`],
                ["Prior Alerts", `${selected.attackMetadata?.previousAlerts || 0} from address`],
              ].map(([k, v]) => (
                <div key={k} style={{ background: "var(--surface2)", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{k}</div>
                  <div style={{ fontSize: 13, fontFamily: "'DM Mono',monospace", color: "var(--text)", fontWeight: 600 }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Timestamp info */}
            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>⏱ Timeline</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>🔴 Attack detected at</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#f87171", fontWeight: 600 }}>
                    {new Date(selected.attackMetadata?.detectedAt || selected.createdAt).toLocaleString()}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📅 Transaction recorded</span>
                  <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(selected.createdAt).toLocaleString()}
                  </span>
                </div>
                {selected.reviewedAt && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>✅ Reviewed at</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#34d399" }}>
                      {new Date(selected.reviewedAt).toLocaleString()}
                    </span>
                  </div>
                )}
                {selected.reviewedBy && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>👤 Reviewed by</span>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#a78bfa" }}>{selected.reviewedBy}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Attacker address */}
            <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "#f87171", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 8, fontWeight: 700 }}>🎯 Attacker Info</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 3 }}>From Address</div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#f87171", wordBreak: "break-all" }}>{selected.fromAddress}</div>
              </div>
              {selected.toAddress && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "var(--text-dim)", marginBottom: 3 }}>To Address</div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>{selected.toAddress}</div>
                </div>
              )}
              {selected.attackMetadata?.transactionCount > 1 && (
                <div style={{ fontSize: 12, color: "#fbbf24", marginTop: 4 }}>
                  ⚡ {selected.attackMetadata.transactionCount} transactions from this address recently
                </div>
              )}
            </div>

            {/* Triggered flags */}
            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 10 }}>⚠ Triggered Detection Rules</div>
              {selected.flags.map((f, i) => (
                <div key={i} style={{ fontSize: 12, color: "#fbbf24", marginBottom: 6, display: "flex", gap: 8, lineHeight: 1.5 }}>
                  <span style={{ flexShrink: 0 }}>#{i + 1}</span><span>{f}</span>
                </div>
              ))}
            </div>

            {/* Recommendation */}
            {selected.attackMetadata?.recommendation && (
              <div style={{ background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: "var(--radius)", padding: "14px 16px", marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: "#00d4ff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6, fontWeight: 700 }}>💡 Recommended Action</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{selected.attackMetadata.recommendation}</div>
              </div>
            )}

            {/* Review note */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 8 }}>Admin Review Note</label>
              <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)}
                placeholder="Document your investigation findings..."
                className="input-field" style={{ height: 72, resize: "vertical", color: "var(--text)", background: "var(--surface2)" }} />
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => updateStatus(selected._id, "dismissed")} className="btn-ghost" style={{ flex: 1, padding: "10px" }}>Dismiss</button>
              <button onClick={() => updateStatus(selected._id, "reviewed")} className="btn-accent" style={{ flex: 1, padding: "10px" }}>Mark Reviewed</button>
              <button onClick={() => updateStatus(selected._id, "confirmed_fraud")}
                style={{ flex: 1, padding: "10px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius)", color: "#f87171", fontFamily: "'Syne',sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Confirm Fraud
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
