import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createDisaster } from "../services/api";
import toast from "react-hot-toast";

export default function NewDisaster() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    disasterId: "", title: "", description: "", location: "",
    lat: "", lng: "", severity: "medium", targetAmount: "", imageUrl: "",
    sourceUrl1: "", sourceUrl2: "",
  });
  const [loading, setLoading] = useState(false);

  const descriptionScore = form.description.length >= 50 ? 25 : 0;
  const gpsScore   = form.lat && form.lng ? 25 : 0;
  const srcScore   = form.sourceUrl1.trim() ? 25 : 0;
  const totalScore = descriptionScore + gpsScore + srcScore;

  const scoreColor =
    totalScore >= 75 ? "var(--accent3)" :
    totalScore >= 50 ? "var(--warning)" :
                       "var(--danger)";
  const scoreLabel = totalScore >= 75 ? "Strong" : totalScore >= 50 ? "Moderate" : "Weak";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.description.trim().length < 50) {
      return toast.error("Description must be at least 50 characters for authenticity.");
    }
    setLoading(true);
    try {
      const sourceUrls = [form.sourceUrl1, form.sourceUrl2].filter(u => u.trim());
      const payload = {
        disasterId:  form.disasterId,
        title:       form.title,
        description: form.description,
        location:    form.location,
        severity:    form.severity,
        targetAmount: parseFloat(form.targetAmount),
        imageUrl:    form.imageUrl,
        sourceUrls,
        gpsCoordinates: form.lat && form.lng
          ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
          : undefined,
      };
      const { data } = await createDisaster(payload);
      if (data.isDuplicate) {
        toast("Possible duplicate detected. Campaign created but flagged for review.", { icon: "⚠" });
      } else {
        toast.success("Campaign created! Awaiting verification by admin.");
      }
      navigate("/disasters");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "block", fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
    marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase",
  };
  const helperStyle = { fontSize: 11, color: "var(--text-dim)", marginTop: 6, letterSpacing: "0.3px" };
  const sectionLabel = {
    fontSize: 11, fontWeight: 700, letterSpacing: "2px",
    textTransform: "uppercase", color: "var(--text-muted)",
  };
  const plusChip = {
    fontSize: 10, fontWeight: 700, color: "var(--accent3)",
    padding: "4px 10px", borderRadius: 20,
    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)",
    letterSpacing: "0.5px", textTransform: "uppercase",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⛓</div>
          <Link to="/disasters" className="nav-logo">SecureAidChain</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/disasters" className="nav-link">← Back to campaigns</Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
            New Campaign
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 10 }}>Create Disaster Campaign</h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
            Campaigns go through a <strong style={{ color: "var(--text)" }}>2-step verification process</strong> before donors can contribute.
            Provide accurate details and supporting evidence to speed up verification.
          </p>
        </div>

        {/* Authenticity score */}
        <div className="card-glow fade-up fade-up-1" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ ...sectionLabel }}>Authenticity score</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: scoreColor }}>
              {scoreLabel} · {totalScore}%
            </span>
          </div>
          <div className="progress-track" style={{ height: 6 }}>
            <div style={{ height: "100%", width: `${totalScore}%`, background: scoreColor, borderRadius: 4, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }} />
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 14, flexWrap: "wrap" }}>
            {[
              ["GPS coordinates", gpsScore > 0],
              ["Description (50+ chars)", form.description.length >= 50],
              ["Source URL provided", !!form.sourceUrl1.trim()],
            ].map(([label, done]) => (
              <span key={label} style={{
                fontSize: 11, letterSpacing: "0.3px",
                color: done ? "var(--accent3)" : "var(--text-dim)",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>{done ? "✓" : "○"}</span> {label}
              </span>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic info */}
          <div className="card-glow fade-up fade-up-2" style={{ padding: 28, marginBottom: 20 }}>
            <p style={{ ...sectionLabel, marginBottom: 20 }}>Basic info</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Disaster ID (unique) *</label>
                  <input value={form.disasterId} required placeholder="flood-vizag-2024-01"
                    onChange={e => setForm({...form, disasterId: e.target.value})}
                    className="input-field" style={{ fontFamily: "'DM Mono', monospace" }} />
                  <p style={helperStyle}>Format: type-location-year-seq</p>
                </div>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input value={form.title} required placeholder="Flood Relief - Vizag, India"
                    onChange={e => setForm({...form, title: e.target.value})}
                    className="input-field" />
                </div>
              </div>

              <div>
                <label style={labelStyle}>
                  Description *
                  <span style={{
                    color: form.description.length >= 50 ? "var(--accent3)" : "var(--danger)",
                    fontWeight: 700, marginLeft: 8, fontFamily: "'DM Mono', monospace", letterSpacing: 0,
                  }}>
                    ({form.description.length}/50 min)
                  </span>
                </label>
                <textarea value={form.description} required rows={4}
                  placeholder="Describe the disaster in detail — what happened, when, how many affected, what aid is needed..."
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="input-field" style={{ resize: "vertical", minHeight: 110, fontFamily: "'Syne', sans-serif" }} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Location *</label>
                  <input value={form.location} required placeholder="Vizag, India"
                    onChange={e => setForm({...form, location: e.target.value})}
                    className="input-field" />
                </div>
                <div>
                  <label style={labelStyle}>Severity *</label>
                  <select value={form.severity} onChange={e => setForm({...form, severity: e.target.value})}
                    className="input-field">
                    {["low","medium","high","critical"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Target (ETH) *</label>
                  <input type="number" value={form.targetAmount} required placeholder="10"
                    onChange={e => setForm({...form, targetAmount: e.target.value})}
                    className="input-field" style={{ fontFamily: "'DM Mono', monospace" }} />
                </div>
              </div>
            </div>
          </div>

          {/* GPS */}
          <div className="card-glow fade-up fade-up-3" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={sectionLabel}>GPS coordinates</p>
              <span style={plusChip}>+25% score</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={labelStyle}>Latitude</label>
                <input type="number" step="any" value={form.lat} placeholder="17.6868"
                  onChange={e => setForm({...form, lat: e.target.value})}
                  className="input-field" style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
              <div>
                <label style={labelStyle}>Longitude</label>
                <input type="number" step="any" value={form.lng} placeholder="83.2185"
                  onChange={e => setForm({...form, lng: e.target.value})}
                  className="input-field" style={{ fontFamily: "'DM Mono', monospace" }} />
              </div>
            </div>
            <p style={helperStyle}>Find coordinates on maps.google.com → right-click the location → copy lat/lng</p>
          </div>

          {/* Source references */}
          <div className="card-glow fade-up fade-up-4" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12 }}>
              <div>
                <p style={sectionLabel}>Source references</p>
                <p style={{ ...helperStyle, marginTop: 4 }}>News articles, government notices, NGO reports</p>
              </div>
              <span style={plusChip}>+25% score</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Source URL 1 (recommended)</label>
                <input value={form.sourceUrl1} placeholder="https://ndma.gov.in/... or https://news.bbc.co.uk/..."
                  onChange={e => setForm({...form, sourceUrl1: e.target.value})}
                  className="input-field" />
              </div>
              <div>
                <label style={labelStyle}>Source URL 2 (optional)</label>
                <input value={form.sourceUrl2} placeholder="https://..."
                  onChange={e => setForm({...form, sourceUrl2: e.target.value})}
                  className="input-field" />
              </div>
            </div>
            <div style={{
              marginTop: 16, padding: "12px 16px",
              background: "rgba(0,212,255,0.05)",
              borderRadius: "var(--radius)",
              border: "1px solid rgba(0,212,255,0.15)",
            }}>
              <p style={{ fontSize: 10, color: "var(--accent)", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 6 }}>
                Trusted source examples
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
                ndma.gov.in · reliefweb.int · ndrf.gov.in · who.int · redcross.org · un.org/en/news
              </p>
            </div>
          </div>

          {/* Image */}
          <div className="card-glow fade-up fade-up-4" style={{ padding: 28, marginBottom: 24 }}>
            <p style={{ ...sectionLabel, marginBottom: 16 }}>Campaign image (optional)</p>
            <input value={form.imageUrl} placeholder="https://... (photo of disaster area)"
              onChange={e => setForm({...form, imageUrl: e.target.value})}
              className="input-field" />
          </div>

          {/* Verification notice */}
          <div className="fade-up" style={{
            padding: "16px 20px", marginBottom: 24,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.25)",
            borderRadius: "var(--radius)",
          }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--warning)", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>
              ⚠ Verification required before going live
            </p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
              After submission, this campaign will be in <strong style={{ color: "var(--text)" }}>Pending</strong> status.
              An admin must review and verify it before donations open.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary"
            style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: "0.5px" }}>
            {loading ? "Submitting..." : "Submit for Verification →"}
          </button>
        </form>
      </main>
    </div>
  );
}
