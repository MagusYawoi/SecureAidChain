import { useEffect, useState } from "react";
import { getUsers, verifyUser, getTransactions, approveDisbursementAPI, getDisbursements, getPendingRequests, getDisasters, verifyDisaster } from "../services/api";
import { connectWallet } from "../services/blockchain";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [disbursements, setDisbursements] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [tab, setTab] = useState("users");
  const [walletAddr, setWalletAddr] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingDisasters, setPendingDisasters] = useState([]);
  const [verifyNotes, setVerifyNotes] = useState({});

  const loadDisbursements = () => {
    getDisbursements().then((r) => setDisbursements(r.data)).catch(() => {});
    getPendingRequests().then((r) => setPendingRequests(r.data.filter((r) => !r.executed))).catch(() => {});
  };

  const loadPendingDisasters = () => {
    getDisasters({ verificationStatus: "unverified" }).then(r => setPendingDisasters(r.data)).catch(() => {});
  };

  useEffect(() => {
    getUsers().then((r) => setUsers(r.data)).catch(() => {});
    getTransactions().then((r) => setTransactions(r.data)).catch(() => {});
    loadDisbursements();
    loadPendingDisasters();
  }, []);

  const handleConnect = async () => {
    try { const addr = await connectWallet(); setWalletAddr(addr); toast.success("Wallet connected"); }
    catch (err) { toast.error(err.message); }
  };

  const handleVerify = async (id) => {
    try {
      await verifyUser(id);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isVerified: true } : u));
      toast.success("User verified");
    } catch { toast.error("Failed to verify"); }
  };

  const handleApprove = async (id) => {
    setLoading(true);
    try {
      await approveDisbursementAPI(id);
      toast.success(`Request #${id} approved!`);
      loadDisbursements();
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
    setLoading(false);
  };

  const handleVerifyDisaster = async (disasterId, action) => {
    const note = verifyNotes[disasterId] || "";
    if (action === "reject" && !note.trim()) return toast.error("Add a rejection reason first");
    try {
      await verifyDisaster(disasterId, action, note);
      toast.success(action === "verify" ? "Campaign verified! Now accepting donations." : "Campaign rejected.");
      setVerifyNotes((prev) => { const n = { ...prev }; delete n[disasterId]; return n; });
      loadPendingDisasters();
    } catch { toast.error(action === "verify" ? "Verification failed" : "Rejection failed"); }
  };

  const severityStyle = (s) => {
    if (s === "critical") return { background: "rgba(239,68,68,0.15)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" };
    if (s === "high")     return { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" };
    if (s === "medium")   return { background: "rgba(0,212,255,0.15)",  color: "var(--accent)", border: "1px solid rgba(0,212,255,0.25)" };
    return { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" };
  };

  const pill = { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.5px" };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />

      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⛓</div>
          <Link to="/dashboard" className="nav-logo">SecureAidChain</Link>
          <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "1.5px", textTransform: "uppercase", marginLeft: 8 }}>Admin</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/disasters" className="nav-link">Campaigns</Link>
          <button onClick={handleConnect} className={walletAddr ? "wallet-chip" : "btn-accent"}>
            {walletAddr ? <><span className="dot" />{walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}</> : "Connect Wallet"}
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>
        <div className="fade-up" style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "var(--accent)", marginBottom: 8 }}>
            Admin Console
          </p>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-1.5px" }}>Management</h1>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
          {[
            ["users", "Users"],
            ["transactions", "Transactions"],
            ["multisig", "Multi-Sig Approvals"],
            ["verification", "Campaign Verification"],
          ].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: "transparent",
              border: "none",
              color: tab === t ? "var(--accent)" : "var(--text-muted)",
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
              transition: "color 0.2s",
              letterSpacing: "0.3px",
            }}>{label}</button>
          ))}
        </div>

        {/* Users */}
        {tab === "users" && (
          <div className="card-glow fade-up" style={{ padding: 28 }}>
            <p className="section-title">User Management</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Email</th><th>Role</th>
                  <th>Wallet</th><th>Verified</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>No users yet</td></tr>
                ) : users.map((u) => (
                  <tr key={u._id}>
                    <td style={{ fontWeight: 600, color: "var(--text)" }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td style={{ textTransform: "capitalize" }}>{u.role}</td>
                    <td className="mono" style={{ fontSize: 11 }}>
                      {u.walletAddress ? `${u.walletAddress.slice(0, 8)}...${u.walletAddress.slice(-4)}` : "—"}
                    </td>
                    <td>
                      <span style={{
                        ...pill,
                        ...(u.isVerified
                          ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                          : { background: "rgba(255,255,255,0.04)", color: "var(--text-dim)", border: "1px solid var(--border)" }),
                      }}>
                        {u.isVerified ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>
                      {!u.isVerified && (
                        <button onClick={() => handleVerify(u._id)} className="btn-accent" style={{ padding: "6px 14px", fontSize: 12 }}>
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions */}
        {tab === "transactions" && (
          <div className="card-glow fade-up" style={{ padding: 28 }}>
            <p className="section-title">All Transactions</p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th><th>Amount</th><th>Disaster</th><th>From</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>No transactions yet</td></tr>
                ) : transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td style={{ textTransform: "capitalize", color: "var(--accent)", fontWeight: 600 }}>{tx.type}</td>
                    <td className="mono">{tx.amount} ETH</td>
                    <td>{tx.disasterId}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{tx.fromAddress ? `${tx.fromAddress.slice(0, 8)}...` : "—"}</td>
                    <td style={{ color: "var(--text-dim)" }}>{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Multi-Sig */}
        {tab === "multisig" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div className="card-glow fade-up" style={{ padding: 28 }}>
              <p className="section-title">Pending Approval</p>
              {pendingRequests.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: 13, padding: "20px 0" }}>No pending requests.</p>
              ) : (
                <table className="data-table">
                  <thead><tr>
                    <th>ID</th><th>Recipient</th><th>Amount</th><th>Disaster</th><th>Action</th>
                  </tr></thead>
                  <tbody>
                    {pendingRequests.map((r) => (
                      <tr key={r.requestId}>
                        <td className="mono">#{r.requestId}</td>
                        <td className="mono" style={{ fontSize: 11 }}>{r.recipient.slice(0, 8)}...{r.recipient.slice(-4)}</td>
                        <td className="mono">{r.amount} ETH</td>
                        <td>{r.disasterId}</td>
                        <td>
                          <button disabled={loading} onClick={() => handleApprove(r.requestId)} className="btn-primary"
                            style={{ padding: "6px 16px", fontSize: 12 }}>
                            {loading ? "..." : "Approve"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card-glow fade-up fade-up-1" style={{ padding: 28 }}>
              <p className="section-title">Executed Disbursements</p>
              {disbursements.length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: 13, padding: "20px 0" }}>No executed disbursements yet.</p>
              ) : (
                <table className="data-table">
                  <thead><tr>
                    <th>ID</th><th>Recipient</th><th>Amount</th><th>Disaster</th><th>Proof</th><th>Status</th>
                  </tr></thead>
                  <tbody>
                    {disbursements.map((d) => (
                      <tr key={d.index}>
                        <td className="mono">#{d.index}</td>
                        <td className="mono" style={{ fontSize: 11 }}>{d.recipient.slice(0, 8)}...{d.recipient.slice(-4)}</td>
                        <td className="mono">{d.amount} ETH</td>
                        <td>{d.disasterId}</td>
                        <td>
                          {d.proofIPFSHash ? (
                            <a href={`https://gateway.pinata.cloud/ipfs/${d.proofIPFSHash}`} target="_blank" rel="noreferrer"
                              style={{ color: "var(--accent)", fontSize: 12 }}>View Proof</a>
                          ) : <span style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <span style={{
                            ...pill,
                            ...(d.confirmed
                              ? { background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                              : { background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }),
                          }}>
                            {d.confirmed ? "Confirmed" : "Executed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Campaign Verification */}
        {tab === "verification" && (
          <div className="card-glow fade-up" style={{ padding: 28 }}>
            <p className="section-title">Campaign Verification</p>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.6 }}>
              Review and verify disaster campaigns before they go live for donations.
              Only verified campaigns accept ETH donations.
            </p>

            {pendingDisasters.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                <p style={{ fontSize: 13 }}>No campaigns pending verification</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {pendingDisasters.map((d) => (
                  <div key={d._id} style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "22px 24px",
                    transition: "border-color 0.3s",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{d.title}</div>
                        <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>{d.disasterId}</div>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        <span style={{ ...pill, ...severityStyle(d.severity), textTransform: "uppercase" }}>{d.severity}</span>
                        {d.isDuplicate && (
                          <span style={{ ...pill, background: "rgba(245,158,11,0.15)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.25)" }}>
                            ⚠ Possible duplicate
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                      {[
                        ["Location", d.location],
                        ["Target", `${d.targetAmount} ETH`],
                        ["Created by", d.createdBy?.name || "Unknown"],
                      ].map(([k, v]) => (
                        <div key={k} style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid var(--border)",
                          borderRadius: 8, padding: "10px 14px",
                        }}>
                          <div style={{ fontSize: 9, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{k}</div>
                          <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Description</div>
                      <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>{d.description}</p>
                    </div>

                    {d.sourceUrls?.length > 0 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>Sources</div>
                        {d.sourceUrls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            style={{ display: "block", fontSize: 12, color: "var(--accent)", marginBottom: 3, wordBreak: "break-all" }}>
                            {url}
                          </a>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
                      {[
                        ["GPS verified", d.autoChecks?.hasGPS],
                        ["Description quality", d.autoChecks?.hasDescription],
                        ["Sources provided", d.autoChecks?.hasSources],
                      ].map(([label, pass]) => (
                        <span key={label} style={{
                          fontSize: 11, padding: "4px 10px", borderRadius: 20,
                          ...(pass
                            ? { background: "rgba(16,185,129,0.1)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }
                            : { background: "rgba(255,255,255,0.03)", color: "var(--text-dim)", border: "1px solid var(--border)" }),
                        }}>
                          {pass ? "✓" : "○"} {label}
                        </span>
                      ))}
                      <span style={{
                        fontSize: 11, padding: "4px 10px", borderRadius: 20,
                        background: "rgba(0,212,255,0.08)", color: "var(--accent)",
                        border: "1px solid rgba(0,212,255,0.25)",
                        fontFamily: "'DM Mono', monospace",
                      }}>
                        Score: {d.autoChecks?.checkScore || 0}%
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        placeholder="Verification note (optional; required for reject)..."
                        value={verifyNotes[d.disasterId] || ""}
                        onChange={e => setVerifyNotes({ ...verifyNotes, [d.disasterId]: e.target.value })}
                        className="input-field"
                        style={{ flex: 1, padding: "10px 14px", fontSize: 13 }}
                      />
                      <button onClick={() => handleVerifyDisaster(d.disasterId, "verify")}
                        style={{
                          padding: "10px 20px", borderRadius: "var(--radius)",
                          background: "linear-gradient(135deg, var(--accent3), #059669)",
                          color: "#fff", border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                          fontFamily: "inherit", letterSpacing: "0.3px",
                        }}>
                        Verify
                      </button>
                      <button onClick={() => handleVerifyDisaster(d.disasterId, "reject")}
                        style={{
                          padding: "10px 20px", borderRadius: "var(--radius)",
                          background: "transparent",
                          color: "#f87171", border: "1px solid rgba(239,68,68,0.3)",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          fontFamily: "inherit", letterSpacing: "0.3px",
                        }}>
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
