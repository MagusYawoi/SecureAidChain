import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { getDisasters, getTransactions } from "../services/api";
import { getContractBalance, getAllocatedFunds, connectWallet } from "../services/blockchain";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user, logoutUser } = useAuth();
  const navigate = useNavigate();
  const [disasters, setDisasters] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [contractBalance, setContractBalance] = useState("--");
  const [myAllocated, setMyAllocated] = useState("--");
  const [walletAddr, setWalletAddr] = useState("");

  useEffect(() => {
    getDisasters({ status: "active" }).then((r) => setDisasters(r.data)).catch(() => {});
    getTransactions().then((r) => setTransactions(r.data.slice(0, 5))).catch(() => {});
    getContractBalance().then(setContractBalance).catch(() => {});
  }, []);

  const handleConnectWallet = async () => {
    try {
      const addr = await connectWallet();
      setWalletAddr(addr);
      if (user?.role === "beneficiary") {
        const allocated = await getAllocatedFunds(addr);
        setMyAllocated(allocated);
      }
      toast.success("Wallet connected!");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const severityColor = (s) => ({ critical: "#f87171", high: "#fbbf24", medium: "#00d4ff", low: "#34d399" }[s] || "#6b7280");

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⛓</div>
          <span className="nav-logo">SecureAidChain</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/disasters" className="nav-link">Disasters</Link>
          {user?.role === "admin" && <Link to="/admin" className="nav-link">Admin</Link>}
          <div style={{ height: 20, width: 1, background: "var(--border)" }} />
          <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'DM Mono', monospace" }}>
            {user?.name} <span style={{ color: "var(--accent2)", fontWeight: 600 }}>[{user?.role}]</span>
          </span>
          <button onClick={handleConnectWallet} className="wallet-chip">
            {walletAddr ? <><div className="dot" />{walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}</> : "Connect Wallet"}
          </button>
          <button onClick={() => { logoutUser(); navigate("/login"); }} className="btn-ghost" style={{ padding: "6px 14px", fontSize: 12 }}>
            Sign out
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
            Mission Control
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px", lineHeight: 1 }}>
            Relief Dashboard
          </h1>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 40 }}>
          {[
            { label: "Active Disasters", value: disasters.length, color: "red" },
            { label: "Contract Balance", value: `${contractBalance} ETH`, color: "cyan" },
            { label: "Total Transactions", value: transactions.length, color: "purple" },
            ...(user?.role === "beneficiary" ? [{ label: "Allocated to You", value: `${myAllocated} ETH`, color: "green" }] : []),
          ].map((s, i) => (
            <div key={s.label} className={`stat-card ${s.color} fade-up fade-up-${i + 1}`}>
              <div className="stat-label">{s.label}</div>
              <div className={`stat-value ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Two columns */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* Active Disasters */}
          <div className="card-glow fade-up fade-up-2" style={{ padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <p className="section-title" style={{ margin: 0 }}>Active Disasters</p>
              <Link to="/disasters" style={{ fontSize: 12, color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>View all →</Link>
            </div>
            {disasters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13 }}>No active disasters</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {disasters.slice(0, 4).map((d) => (
                  <div key={d._id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "14px 16px", borderRadius: "var(--radius)",
                    background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)",
                    transition: "all 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-hover)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{d.title}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.location}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20,
                          background: `${severityColor(d.severity)}20`, color: severityColor(d.severity),
                          border: `1px solid ${severityColor(d.severity)}40`, textTransform: "uppercase", letterSpacing: "0.5px"
                        }}>{d.severity}</span>
                      </div>
                    </div>
                    <Link to={`/disasters/${d.disasterId}`} className="btn-accent" style={{ padding: "6px 16px", fontSize: 12, textDecoration: "none" }}>
                      Donate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Transactions */}
          <div className="card-glow fade-up fade-up-3" style={{ padding: 28 }}>
            <p className="section-title">Recent Transactions</p>
            {transactions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)", fontSize: 13 }}>No transactions yet</div>
            ) : (
              <table className="data-table">
                <thead><tr>
                  <th>Type</th><th>Amount</th><th>Disaster</th><th>Date</th>
                </tr></thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id}>
                      <td>
                        <span style={{
                          fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize",
                          background: tx.type === "donation" ? "rgba(0,212,255,0.1)" : "rgba(124,58,237,0.1)",
                          color: tx.type === "donation" ? "var(--accent)" : "#a78bfa",
                          border: `1px solid ${tx.type === "donation" ? "rgba(0,212,255,0.2)" : "rgba(124,58,237,0.2)"}`
                        }}>{tx.type}</span>
                      </td>
                      <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{tx.amount} ETH</td>
                      <td style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.disasterId}</td>
                      <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Chain info bar */}
        <div className="fade-up fade-up-4" style={{
          marginTop: 24, padding: "16px 24px",
          background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.1)",
          borderRadius: "var(--radius)", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 8px #34d399" }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Hardhat Local Network</span>
          </div>
          {[["Chain ID", "31337"], ["RPC", "localhost:8545"], ["Protocol", "Ethereum"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-dim)", letterSpacing: "0.5px", textTransform: "uppercase" }}>{k}</span>
              <span style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: "var(--accent)" }}>{v}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
