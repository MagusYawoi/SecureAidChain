import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDisasters } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function Disasters() {
  const { user } = useAuth();
  const [disasters, setDisasters] = useState([]);
  const [filter, setFilter] = useState({ status: "", severity: "" });

  useEffect(() => {
    getDisasters({ ...filter, verificationStatus: "verified" }).then((r) => setDisasters(r.data)).catch(() => {});
  }, [filter]);

  const severityBadge = (s) => {
    const map = {
      critical: { bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" },
      high:     { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)" },
      medium:   { bg: "rgba(0,212,255,0.12)",  color: "#00d4ff", border: "rgba(0,212,255,0.25)" },
      low:      { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
    };
    const c = map[s] || map.low;
    return (
      <span style={{
        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        textTransform: "uppercase", letterSpacing: "0.8px"
      }}>{s}</span>
    );
  };

  const pct = (d) => Math.min(((d.collectedAmount || 0) / (d.targetAmount || 1)) * 100, 100);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⛓</div>
          <span className="nav-logo">SecureAidChain</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/dashboard" className="nav-link">Dashboard</Link>
          {["admin", "ngo", "government"].includes(user?.role) && (
            <Link to="/disasters/new" className="btn-primary" style={{ padding: "8px 16px", fontSize: 13, textDecoration: "none" }}>
              + New Campaign
            </Link>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
              Active Campaigns
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px" }}>Disaster Relief</h1>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="input-field" style={{ width: "auto", fontSize: 13, padding: "8px 14px" }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="pending">Pending</option>
            </select>
            <select value={filter.severity} onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="input-field" style={{ width: "auto", fontSize: 13, padding: "8px 14px" }}>
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Count */}
        <div style={{ marginBottom: 24, fontSize: 13, color: "var(--text-muted)" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", color: "var(--accent)", fontWeight: 600 }}>{disasters.length}</span> campaigns found
        </div>

        {disasters.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 16 }}>No disasters found</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {disasters.map((d, i) => (
              <div key={d._id} className={`card-glow fade-up fade-up-${(i % 4) + 1}`} style={{ padding: 24 }}>
                {/* Top row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 4 }}>{d.title}</h3>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>📍 {d.location}</span>
                  </div>
                  {severityBadge(d.severity)}
                </div>

                {/* Description */}
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 20, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {d.description}
                </p>

                {/* Progress */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>
                      {d.collectedAmount || 0} ETH raised
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Goal: {d.targetAmount} ETH</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct(d)}%` }} />
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)", textAlign: "right" }}>
                    {pct(d).toFixed(1)}% funded
                  </div>
                </div>

                {/* CTA */}
                <Link to={`/disasters/${d.disasterId}`} className="btn-primary"
                  style={{ display: "block", textAlign: "center", textDecoration: "none", padding: "12px" }}>
                  View & Donate →
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
