import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDisaster, getTransactions, recordTransaction, generateQR, uploadToIPFS, getDisbursements, confirmDeliveryAPI, requestDisbursementAPI, getBeneficiaries } from "../services/api";
import { donate, requestDisbursement, withdraw, connectWallet, getAllocatedFunds } from "../services/blockchain";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { downloadDonationReceipt } from "../utils/receipt";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_LABEL = "JPG, PNG, WEBP or PDF (max 10MB)";

const severityColor = (s) => ({
  critical: { bg: "rgba(239,68,68,0.12)", color: "#f87171", border: "rgba(239,68,68,0.25)" },
  high:     { bg: "rgba(245,158,11,0.12)", color: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  medium:   { bg: "rgba(0,212,255,0.12)",  color: "#00d4ff", border: "rgba(0,212,255,0.25)" },
  low:      { bg: "rgba(16,185,129,0.12)", color: "#34d399", border: "rgba(16,185,129,0.25)" },
}[s] || { bg: "rgba(107,114,128,0.12)", color: "#9ca3af", border: "rgba(107,114,128,0.25)" });

const Section = ({ title, children }) => (
  <div className="card-glow fade-up" style={{ padding: 28, marginBottom: 20 }}>
    <p className="section-title">{title}</p>
    {children}
  </div>
);

export default function DisasterDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [disaster, setDisaster] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [donateAmount, setDonateAmount] = useState("");
  const [disbAmount, setDisbAmount] = useState("");
  const [recipientAddr, setRecipientAddr] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [allocatedFunds, setAllocatedFundsState] = useState("0");
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [disbursements, setDisbursements] = useState([]);
  const [selectedDisbIndex, setSelectedDisbIndex] = useState("");
  const [beneficiaries, setBeneficiaries] = useState([]);
  const [lastDonation, setLastDonation] = useState(null);

  useEffect(() => {
    getDisaster(id).then((r) => setDisaster(r.data)).catch(() => toast.error("Disaster not found"));
    getTransactions({ disasterId: id }).then((r) => setTransactions(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (["admin", "ngo", "beneficiary"].includes(user?.role)) {
      getDisbursements().then((r) => setDisbursements(r.data.filter((d) => d.disasterId === id))).catch(() => {});
    }
    if (["admin", "ngo", "government"].includes(user?.role)) {
      getBeneficiaries().then((r) => setBeneficiaries(r.data)).catch(() => {});
    }
  }, [id, user]);

  const handleConnect = async () => {
    try {
      const addr = await connectWallet();
      setWalletAddr(addr);
      const alloc = await getAllocatedFunds(addr);
      setAllocatedFundsState(alloc);
      toast.success("Wallet connected");
    } catch (err) { toast.error(err.message); }
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!walletAddr) return toast.error("Connect your wallet first");
    setLoading(true);
    try {
      const amountSnapshot = donateAmount;
      const receipt = await donate(id, donateAmount);
      await recordTransaction({ txHash: receipt.hash, type: "donation", fromAddress: walletAddr, amount: donateAmount, disasterId: id, blockNumber: receipt.blockNumber });
      toast.success("Donation successful!");
      setLastDonation({
        donorName: user?.name || "Anonymous",
        donorEmail: user?.email || "",
        donorWallet: walletAddr,
        disasterTitle: disaster?.title || "",
        disasterId: disaster?.disasterId || id,
        disasterLocation: disaster?.location || "",
        amount: amountSnapshot,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        network: "Hardhat Local (Chain ID 31337)",
        timestamp: Date.now(),
      });
      setDonateAmount("");
      getTransactions({ disasterId: id }).then((r) => setTransactions(r.data));
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleDownloadReceipt = async () => {
    if (!lastDonation) return;
    try {
      await downloadDonationReceipt(lastDonation);
    } catch (err) {
      toast.error("Failed to generate receipt");
      console.error(err);
    }
  };

  const handleDownloadReceiptForTx = async (tx) => {
    try {
      await downloadDonationReceipt({
        donorName: user?.name || "Anonymous",
        donorEmail: user?.email || "",
        donorWallet: tx.fromAddress,
        disasterTitle: disaster?.title || "",
        disasterId: disaster?.disasterId || id,
        disasterLocation: disaster?.location || "",
        amount: tx.amount,
        txHash: tx.txHash,
        blockNumber: tx.blockNumber,
        network: "Hardhat Local (Chain ID 31337)",
        timestamp: new Date(tx.createdAt).getTime(),
      });
    } catch (err) {
      toast.error("Failed to generate receipt");
      console.error(err);
    }
  };

  const handleRequestDisbursement = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await requestDisbursementAPI(recipientAddr, disbAmount, id);
      await recordTransaction({ txHash: data.txHash, type: "disbursement", fromAddress: walletAddr || "admin", toAddress: recipientAddr, amount: disbAmount, disasterId: id });
      toast.success("Disbursement request submitted!");
      setDisbAmount(""); setRecipientAddr("");
      getDisbursements().then((r) => setDisbursements(r.data.filter((d) => d.disasterId === id))).catch(() => {});
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
    setLoading(false);
  };

  const handleWithdraw = async () => {
    if (!walletAddr) return toast.error("Connect your wallet first");
    setLoading(true);
    try {
      const receipt = await withdraw();
      await recordTransaction({ txHash: receipt.hash, type: "withdrawal", fromAddress: walletAddr, amount: allocatedFunds, disasterId: id, blockNumber: receipt.blockNumber });
      toast.success("Withdrawal successful!");
      setAllocatedFundsState("0");
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    if (!proofFile) return toast.error("Select a proof document first");
    if (!ALLOWED_TYPES.includes(proofFile.type)) return toast.error("Invalid file type. Allowed: " + ALLOWED_LABEL);
    if (proofFile.size > 10 * 1024 * 1024) return toast.error("File too large. Maximum size is 10MB");
    if (selectedDisbIndex === "") return toast.error("Select a disbursement to confirm");
    setLoading(true);
    try {
      const { data: ipfsData } = await uploadToIPFS(proofFile);
      await confirmDeliveryAPI(Number(selectedDisbIndex), ipfsData.ipfsHash);
      toast.success(`Delivery confirmed! IPFS: ${ipfsData.ipfsHash}`);
      setProofFile(null); setSelectedDisbIndex("");
      getDisbursements().then((r) => setDisbursements(r.data.filter((d) => d.disasterId === id))).catch(() => {});
    } catch (err) { toast.error(err.response?.data?.message || err.message); }
    setLoading(false);
  };

  const handleGenerateQR = async () => {
    try {
      const { data } = await generateQR({ disasterId: id, walletAddress: walletAddr || user?.walletAddress || "N/A", type: "beneficiary" });
      setQrCode(data.qrDataUrl);
    } catch { toast.error("Failed to generate QR"); }
  };

  if (!disaster) return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
    </div>
  );

  const pct = Math.min(((disaster.collectedAmount || 0) / (disaster.targetAmount || 1)) * 100, 100);
  const sc = severityColor(disaster.severity);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }} className="grid-bg">
      <div className="orb orb-1" /><div className="orb orb-2" />

      {/* Navbar */}
      <nav className="navbar">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--accent2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⛓</div>
          <Link to="/disasters" className="nav-logo" style={{ textDecoration: "none" }}>SecureAidChain</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/disasters" className="nav-link">← Back to Disasters</Link>
          <button onClick={handleConnect} className="wallet-chip">
            {walletAddr ? <><div className="dot" />{walletAddr.slice(0, 6)}...{walletAddr.slice(-4)}</> : "Connect Wallet"}
          </button>
        </div>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "40px 32px", position: "relative", zIndex: 1 }}>

        {/* Hero card */}
        <div className="card-glow fade-up" style={{ padding: 32, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-1px" }}>{disaster.title}</h1>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 20, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>
              {disaster.severity}
            </span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>📍 {disaster.location}</p>
          <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>{disaster.description}</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--accent)", fontWeight: 500 }}>{disaster.collectedAmount || 0} ETH raised</span>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Goal: {disaster.targetAmount} ETH</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-dim)", textAlign: "right" }}>{pct.toFixed(1)}% funded</div>
        </div>

        {/* GPS Map */}
        {disaster.gpsCoordinates?.lat && (
          <Section title="GPS Location">
            <MapContainer center={[disaster.gpsCoordinates.lat, disaster.gpsCoordinates.lng]} zoom={10} style={{ height: "250px", borderRadius: "var(--radius)" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[disaster.gpsCoordinates.lat, disaster.gpsCoordinates.lng]}>
                <Popup>{disaster.title}</Popup>
              </Marker>
            </MapContainer>
          </Section>
        )}

        {/* Donate */}
        {user?.role === "donor" && (
          disaster.verificationStatus === "verified" ? (
            <Section title="Make a Donation">
              <form onSubmit={handleDonate} style={{ display: "flex", gap: 12 }}>
                <input type="number" step="0.001" min="0.001" placeholder="Amount in ETH"
                  value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} required className="input-field" />
                <button disabled={loading} className="btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 24px" }}>
                  {loading ? "..." : "Donate →"}
                </button>
              </form>
            </Section>
          ) : (
            <div className="card-glow fade-up" style={{
              padding: 24, marginBottom: 20,
              borderColor: "rgba(245,158,11,0.3)",
              background: "rgba(245,158,11,0.05)",
            }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--warning)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                {disaster.verificationStatus === "rejected" ? "Campaign rejected" : "Pending verification"}
              </p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7 }}>
                {disaster.verificationStatus === "rejected"
                  ? "This campaign was rejected during review and cannot accept donations."
                  : "An admin is reviewing this campaign. Donations will open once it's verified."}
              </p>
            </div>
          )
        )}

        {/* Receipt — appears after a successful donation */}
        {lastDonation && user?.role === "donor" && (
          <div className="card-glow fade-up" style={{
            padding: 24, marginBottom: 20,
            borderColor: "rgba(16,185,129,0.3)",
            background: "rgba(16,185,129,0.05)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent3)", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                  ✓ Donation confirmed
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 8 }}>
                  You donated <strong style={{ color: "var(--text)" }} className="mono">{lastDonation.amount} ETH</strong> to <strong style={{ color: "var(--text)" }}>{lastDonation.disasterTitle}</strong>. Download a PDF receipt for your records.
                </p>
                <p className="mono" style={{ fontSize: 11, color: "var(--text-dim)", wordBreak: "break-all" }}>
                  {lastDonation.txHash}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button onClick={handleDownloadReceipt} className="btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 20px" }}>
                  Download Receipt
                </button>
                <button onClick={() => setLastDonation(null)} className="btn-ghost" style={{ padding: "12px 16px", fontSize: 13 }}>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Request Disbursement */}
        {["admin", "ngo", "government"].includes(user?.role) && (
          <Section title="Request Disbursement">
            <form onSubmit={handleRequestDisbursement} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {beneficiaries.length > 0 ? (
                <select value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} required className="input-field">
                  <option value="">Select beneficiary...</option>
                  {beneficiaries.map((b) => (
                    <option key={b._id} value={b.walletAddress}>{b.name} — {b.walletAddress.slice(0, 12)}...</option>
                  ))}
                </select>
              ) : (
                <input type="text" placeholder="Recipient wallet address (0x...)"
                  value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} required className="input-field" />
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <input type="number" step="0.001" min="0.001" placeholder="Amount in ETH"
                  value={disbAmount} onChange={(e) => setDisbAmount(e.target.value)} required className="input-field" />
                <button disabled={loading} className="btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 24px", background: "linear-gradient(135deg, #f59e0b, #d97706)" }}>
                  {loading ? "..." : "Request"}
                </button>
              </div>
            </form>
          </Section>
        )}

        {/* IPFS Proof of Delivery — admin/ngo can confirm any; beneficiary only their own */}
        {["admin", "ngo", "beneficiary"].includes(user?.role) && disbursements.length > 0 && (
          <Section title="Confirm Delivery (IPFS Proof)">
            <form onSubmit={handleConfirmDelivery} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <select value={selectedDisbIndex} onChange={(e) => setSelectedDisbIndex(e.target.value)} required className="input-field">
                <option value="">Select disbursement to confirm...</option>
                {disbursements.map((d) => (
                  <option key={d.index} value={d.index} disabled={d.confirmed}>
                    #{d.index} — {d.amount} ETH → {d.recipient.slice(0, 10)}...{d.confirmed ? " ✓ Confirmed" : ""}
                  </option>
                ))}
              </select>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => setProofFile(e.target.files[0])} required
                    style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "10px 14px", color: "var(--text)", fontSize: 13 }} />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>Allowed: {ALLOWED_LABEL}</p>
                </div>
                <button disabled={loading} className="btn-primary" style={{ whiteSpace: "nowrap", padding: "12px 24px", background: "linear-gradient(135deg, #10b981, #059669)" }}>
                  {loading ? "Uploading..." : "Upload & Confirm"}
                </button>
              </div>
              {disbursements.filter((d) => d.confirmed).map((d) => (
                <div key={d.index} style={{ fontSize: 13, color: "#34d399", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
                  ✓ Disbursement #{d.index} confirmed —{" "}
                  <a href={`https://gateway.pinata.cloud/ipfs/${d.proofIPFSHash}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>
                    View proof on IPFS
                  </a>
                </div>
              ))}
            </form>
          </Section>
        )}

        {/* Withdraw (Beneficiary) */}
        {user?.role === "beneficiary" && parseFloat(allocatedFunds) > 0 && (
          <Section title="Allocated Funds">
            <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
              You have <span style={{ color: "#34d399", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{allocatedFunds} ETH</span> allocated for withdrawal.
            </p>
            <button onClick={handleWithdraw} disabled={loading} className="btn-primary" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
              {loading ? "Withdrawing..." : "Withdraw Funds"}
            </button>
          </Section>
        )}

        {/* QR Code */}
        <Section title="QR Code">
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <button onClick={handleGenerateQR} className="btn-accent">Generate QR</button>
            {qrCode && <img src={qrCode} alt="QR Code" style={{ width: 120, height: 120, borderRadius: "var(--radius)", border: "1px solid var(--border)", padding: 8 }} />}
          </div>
        </Section>

        {/* Transaction History */}
        <Section title="Transaction History">
          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-dim)", fontSize: 13 }}>No transactions yet</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Type</th><th>Amount</th><th>From</th><th>Date</th><th>Receipt</th></tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <span style={{
                        fontWeight: 600, fontSize: 12, padding: "3px 10px", borderRadius: 20, textTransform: "capitalize",
                        background: tx.type === "donation" ? "rgba(0,212,255,0.1)" : tx.type === "withdrawal" ? "rgba(16,185,129,0.1)" : "rgba(124,58,237,0.1)",
                        color: tx.type === "donation" ? "var(--accent)" : tx.type === "withdrawal" ? "#34d399" : "#a78bfa",
                        border: `1px solid ${tx.type === "donation" ? "rgba(0,212,255,0.2)" : tx.type === "withdrawal" ? "rgba(16,185,129,0.2)" : "rgba(124,58,237,0.2)"}`
                      }}>{tx.type}</span>
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{tx.amount} ETH</td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12 }}>{tx.fromAddress?.slice(0, 10)}...</td>
                    <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td>
                      {tx.type === "donation" && tx.txHash ? (
                        <button onClick={() => handleDownloadReceiptForTx(tx)}
                          style={{
                            background: "transparent",
                            color: "var(--accent)",
                            border: "1px solid rgba(0,212,255,0.25)",
                            padding: "4px 12px",
                            borderRadius: 20,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            letterSpacing: "0.3px",
                          }}
                          title="Download PDF receipt for this donation">
                          Download
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-dim)", fontSize: 12 }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

      </main>
    </div>
  );
}
