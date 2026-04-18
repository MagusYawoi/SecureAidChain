import { useEffect, useState } from "react";
import { getUsers, verifyUser, getTransactions, approveDisbursementAPI, getDisbursements, getPendingRequests } from "../services/api";
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
  const [requestId, setRequestId] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDisbursements = () => {
    getDisbursements().then((r) => setDisbursements(r.data)).catch(() => {});
    getPendingRequests().then((r) => setPendingRequests(r.data.filter((r) => !r.executed))).catch(() => {});
  };

  useEffect(() => {
    getUsers().then((r) => setUsers(r.data)).catch(() => {});
    getTransactions().then((r) => setTransactions(r.data)).catch(() => {});
    loadDisbursements();
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

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <Link to="/dashboard" className="font-bold text-xl">SecureAidChain — Admin</Link>
        <button onClick={handleConnect} className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium">
          {walletAddr ? walletAddr.slice(0, 8) + "..." : "Connect Wallet"}
        </button>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          {["users", "transactions", "multisig"].map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`pb-3 px-2 text-sm font-medium capitalize ${tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
              {t === "multisig" ? "Multi-Sig Approvals" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {tab === "users" && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">User Management</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Name</th><th className="pb-2">Email</th>
                <th className="pb-2">Role</th><th className="pb-2">Wallet</th>
                <th className="pb-2">Verified</th><th className="pb-2">Action</th>
              </tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b last:border-0">
                    <td className="py-2 font-medium">{u.name}</td>
                    <td className="py-2 text-gray-500">{u.email}</td>
                    <td className="py-2 capitalize">{u.role}</td>
                    <td className="py-2 text-gray-400 text-xs">{u.walletAddress ? u.walletAddress.slice(0, 10) + "..." : "—"}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${u.isVerified ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.isVerified ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="py-2">
                      {!u.isVerified && (
                        <button onClick={() => handleVerify(u._id)}
                          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700">Verify</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Transactions Tab */}
        {tab === "transactions" && (
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">All Transactions</h3>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Type</th><th className="pb-2">Amount</th>
                <th className="pb-2">Disaster</th><th className="pb-2">From</th>
                <th className="pb-2">Date</th>
              </tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b last:border-0">
                    <td className="py-2 capitalize font-medium text-indigo-700">{tx.type}</td>
                    <td className="py-2">{tx.amount} ETH</td>
                    <td className="py-2">{tx.disasterId}</td>
                    <td className="py-2 text-gray-400 text-xs">{tx.fromAddress?.slice(0, 10)}...</td>
                    <td className="py-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Multi-Sig Tab */}
        {tab === "multisig" && (
          <div className="bg-white rounded-xl shadow p-6 space-y-6">
            {/* Pending Requests */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Pending Approval</h3>
              {pendingRequests.length === 0 ? (
                <p className="text-gray-400 text-sm">No pending requests.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Disaster</th>
                    <th className="pb-2">Action</th>
                  </tr></thead>
                  <tbody>
                    {pendingRequests.map((r) => (
                      <tr key={r.requestId} className="border-b last:border-0">
                        <td className="py-2">#{r.requestId}</td>
                        <td className="py-2 text-gray-400 text-xs">{r.recipient.slice(0, 10)}...</td>
                        <td className="py-2">{r.amount} ETH</td>
                        <td className="py-2">{r.disasterId}</td>
                        <td className="py-2">
                          <button disabled={loading} onClick={() => handleApprove(r.requestId)}
                            className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50">
                            {loading ? "..." : "Approve"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {/* Executed Disbursements */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4">Executed Disbursements</h3>
              {disbursements.length === 0 ? (
                <p className="text-gray-400 text-sm">No executed disbursements yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Recipient</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2">Disaster</th>
                    <th className="pb-2">Proof</th>
                    <th className="pb-2">Status</th>
                  </tr></thead>
                  <tbody>
                    {disbursements.map((d) => (
                      <tr key={d.index} className="border-b last:border-0">
                        <td className="py-2">#{d.index}</td>
                        <td className="py-2 text-gray-400 text-xs">{d.recipient.slice(0, 10)}...</td>
                        <td className="py-2">{d.amount} ETH</td>
                        <td className="py-2">{d.disasterId}</td>
                        <td className="py-2">
                          {d.proofIPFSHash ? (
                            <a href={`https://gateway.pinata.cloud/ipfs/${d.proofIPFSHash}`} target="_blank" rel="noreferrer"
                              className="text-indigo-600 underline text-xs">View Proof</a>
                          ) : <span className="text-gray-400 text-xs">—</span>}
                        </td>
                        <td className="py-2">
                          {d.confirmed
                            ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Confirmed</span>
                            : <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">Executed</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
