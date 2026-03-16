import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getDisaster, getTransactions, recordTransaction, generateQR, uploadToIPFS, getDisbursements, confirmDeliveryAPI, requestDisbursementAPI, getUsers } from "../services/api";
import { donate, requestDisbursement, withdraw, connectWallet, getAllocatedFunds } from "../services/blockchain";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

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

  useEffect(() => {
    getDisaster(id).then((r) => setDisaster(r.data)).catch(() => toast.error("Disaster not found"));
    getTransactions({ disasterId: id }).then((r) => setTransactions(r.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (user?.role === "admin") {
      getDisbursements().then((r) => setDisbursements(r.data.filter((d) => d.disasterId === id))).catch(() => {});
      getUsers({ role: "beneficiary" }).then((r) => setBeneficiaries(r.data.filter((u) => u.walletAddress))).catch(() => {});
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
      const receipt = await donate(id, donateAmount);
      await recordTransaction({
        txHash: receipt.hash,
        type: "donation",
        fromAddress: walletAddr,
        amount: donateAmount,
        disasterId: id,
        blockNumber: receipt.blockNumber,
      });
      toast.success("Donation successful!");
      setDonateAmount("");
      getTransactions({ disasterId: id }).then((r) => setTransactions(r.data));
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleRequestDisbursement = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await requestDisbursementAPI(recipientAddr, disbAmount, id);
      await recordTransaction({
        txHash: data.txHash,
        type: "disbursement",
        fromAddress: walletAddr || "admin",
        toAddress: recipientAddr,
        amount: disbAmount,
        disasterId: id,
      });
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
      await recordTransaction({
        txHash: receipt.hash, type: "withdrawal",
        fromAddress: walletAddr, amount: allocatedFunds,
        disasterId: id, blockNumber: receipt.blockNumber,
      });
      toast.success("Withdrawal successful!");
      setAllocatedFundsState("0");
    } catch (err) { toast.error(err.message); }
    setLoading(false);
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    if (!proofFile) return toast.error("Select a proof document first");
    if (selectedDisbIndex === "") return toast.error("Select a disbursement to confirm");
    setLoading(true);
    try {
      const { data: ipfsData } = await uploadToIPFS(proofFile);
      await confirmDeliveryAPI(Number(selectedDisbIndex), ipfsData.ipfsHash);
      toast.success(`Delivery confirmed! IPFS: ${ipfsData.ipfsHash}`);
      setProofFile(null);
      setSelectedDisbIndex("");
      getDisbursements().then((r) => setDisbursements(r.data.filter((d) => d.disasterId === id))).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || err.message);
    }
    setLoading(false);
  };

  const handleGenerateQR = async () => {
    try {
      const { data } = await generateQR({ disasterId: id, walletAddress: walletAddr || user?.walletAddress || "N/A", type: "beneficiary" });
      setQrCode(data.qrDataUrl);
    } catch { toast.error("Failed to generate QR"); }
  };

  if (!disaster) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <Link to="/disasters" className="font-bold text-xl">SecureAidChain</Link>
        <button onClick={handleConnect} className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
          {walletAddr ? walletAddr.slice(0, 8) + "..." : "Connect Wallet"}
        </button>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-3">
            <h2 className="text-2xl font-bold text-gray-800">{disaster.title}</h2>
            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium capitalize">{disaster.severity}</span>
          </div>
          <p className="text-gray-500 mb-2">{disaster.location}</p>
          <p className="text-gray-600 mb-4">{disaster.description}</p>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>{disaster.collectedAmount} ETH raised</span>
              <span>Goal: {disaster.targetAmount} ETH</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-indigo-600 h-3 rounded-full" style={{ width: `${Math.min((disaster.collectedAmount / disaster.targetAmount) * 100, 100)}%` }} />
            </div>
          </div>
        </div>

        {/* GPS Map */}
        {disaster.gpsCoordinates?.lat && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-3">GPS Location</h3>
            <MapContainer
              center={[disaster.gpsCoordinates.lat, disaster.gpsCoordinates.lng]}
              zoom={10} style={{ height: "250px", borderRadius: "8px" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={[disaster.gpsCoordinates.lat, disaster.gpsCoordinates.lng]}>
                <Popup>{disaster.title}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Donate */}
        {user?.role === "donor" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Make a Donation</h3>
            <form onSubmit={handleDonate} className="flex gap-3">
              <input
                type="number" step="0.001" min="0.001" placeholder="Amount in ETH"
                value={donateAmount} onChange={(e) => setDonateAmount(e.target.value)} required
                className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
                {loading ? "..." : "Donate"}
              </button>
            </form>
          </div>
        )}

        {/* Request Disbursement (NGO) */}
        {(user?.role === "ngo" || user?.role === "admin") && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Request Disbursement</h3>
            <form onSubmit={handleRequestDisbursement} className="space-y-3">
              {beneficiaries.length > 0 ? (
                <select
                  value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select beneficiary...</option>
                  {beneficiaries.map((b) => (
                    <option key={b._id} value={b.walletAddress}>
                      {b.name} — {b.walletAddress.slice(0, 12)}...
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text" placeholder="Recipient wallet address (0x...)"
                  value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <div className="flex gap-3">
                <input
                  type="number" step="0.001" min="0.001" placeholder="Amount in ETH"
                  value={disbAmount} onChange={(e) => setDisbAmount(e.target.value)} required
                  className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button disabled={loading} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50">
                  {loading ? "..." : "Request"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* IPFS Proof of Delivery (Admin) */}
        {user?.role === "admin" && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Confirm Delivery (IPFS Proof)</h3>
            <form onSubmit={handleConfirmDelivery} className="space-y-3">
              <select
                value={selectedDisbIndex}
                onChange={(e) => setSelectedDisbIndex(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select disbursement to confirm...</option>
                {disbursements.map((d) => (
                  <option key={d.index} value={d.index} disabled={d.confirmed}>
                    #{d.index} — {d.amount} ETH → {d.recipient.slice(0, 10)}...
                    {d.confirmed ? " ✓ Confirmed" : ""}
                  </option>
                ))}
              </select>
              <div className="flex gap-3 items-center">
                <input
                  type="file" accept="image/*,application/pdf"
                  onChange={(e) => setProofFile(e.target.files[0])}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  required
                />
                <button disabled={loading} className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
                  {loading ? "Uploading..." : "Upload & Confirm"}
                </button>
              </div>
              {disbursements.filter((d) => d.confirmed).map((d) => (
                <div key={d.index} className="text-sm text-green-700 bg-green-50 rounded p-2">
                  ✓ Disbursement #{d.index} confirmed —{" "}
                  <a href={`https://gateway.pinata.cloud/ipfs/${d.proofIPFSHash}`} target="_blank" rel="noreferrer" className="underline">
                    View proof on IPFS
                  </a>
                </div>
              ))}
            </form>
          </div>
        )}

        {/* Withdraw (Beneficiary) */}
        {user?.role === "beneficiary" && parseFloat(allocatedFunds) > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Allocated Funds</h3>
            <p className="text-gray-600 mb-4">You have <strong>{allocatedFunds} ETH</strong> allocated for withdrawal.</p>
            <button onClick={handleWithdraw} disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50">
              {loading ? "Withdrawing..." : "Withdraw Funds"}
            </button>
          </div>
        )}

        {/* QR Code */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">QR Code</h3>
            <button onClick={handleGenerateQR} className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-200">
              Generate QR
            </button>
          </div>
          {qrCode && <img src={qrCode} alt="QR Code" className="w-40 h-40 mx-auto border p-2 rounded" />}
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Transaction History</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx._id} className="flex justify-between items-center border-b pb-3 text-sm">
                  <div>
                    <span className="font-medium capitalize text-indigo-700">{tx.type}</span>
                    <p className="text-gray-400 text-xs">{tx.fromAddress?.slice(0, 10)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{tx.amount} ETH</p>
                    <p className="text-gray-400 text-xs">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
