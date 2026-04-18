import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await login(form);
      loginUser(data.token, data.user);
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--bg)" }}>
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Left panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between",
        padding: "48px", borderRight: "1px solid var(--border)", position: "relative",
        background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(0,212,255,0.03))"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "64px" }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, var(--accent2), var(--accent))",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "white"
            }}>⛓</div>
            <span style={{ fontWeight: 800, fontSize: 18 }}>SecureAidChain</span>
          </div>

          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 16 }}>
            Blockchain Relief Protocol
          </p>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-2px", marginBottom: 48 }}>
            Transparent aid.<br />
            <span style={{ background: "linear-gradient(135deg, var(--accent), var(--accent2))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Zero corruption.
            </span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              ["🔐", "AES-256 encrypted sensitive data"],
              ["⛓", "Every transaction immutable on Ethereum"],
              ["🌐", "IPFS proof of delivery, stored forever"],
              ["✍️", "Multi-signature fund release"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "var(--surface2)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0
                }}>{icon}</div>
                <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 40 }}>
          {[["10K+", "Donors"], ["$2M+", "Raised"], ["99.9%", "Uptime"]].map(([val, label]) => (
            <div key={label}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 500, color: "var(--accent)", marginBottom: 4 }}>{val}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "1px", textTransform: "uppercase" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — form */}
      <div style={{
        width: "100%", maxWidth: 480,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 40px", position: "relative", zIndex: 1
      }}>
        <div style={{ width: "100%" }} className="fade-up">
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Welcome back</p>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px", marginBottom: 8 }}>Sign in to continue</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 40 }}>Access your SecureAidChain dashboard</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Email address</label>
              <input type="email" required value={form.email} placeholder="you@example.com"
                onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
            </div>
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Password</label>
              <input type="password" required value={form.password} placeholder="••••••••"
                onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: "100%", padding: "14px", fontSize: 15 }}>
              {loading ? "Authenticating..." : "Sign In →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--text-muted)" }}>
            No account?{" "}
            <Link to="/register" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Create one →</Link>
          </p>

        </div>
      </div>
    </div>
  );
}
