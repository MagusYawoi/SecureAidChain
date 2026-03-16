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
      toast.success("Wallet connected: " + addr.slice(0, 6) + "...");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const statCard = (label, value, color) => (
    <div className={`bg-white rounded-xl shadow p-6 border-l-4 ${color}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">SecureAidChain</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-80">{user?.name} ({user?.role})</span>
          <button
            onClick={handleConnectWallet}
            className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-50"
          >
            {walletAddr ? walletAddr.slice(0, 8) + "..." : "Connect Wallet"}
          </button>
          <Link to="/disasters" className="text-sm hover:underline">Disasters</Link>
          {user?.role === "admin" && <Link to="/admin" className="text-sm hover:underline">Admin</Link>}
          <button onClick={() => { logoutUser(); navigate("/login"); }} className="text-sm hover:underline opacity-70">Logout</button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCard("Active Disasters", disasters.length, "border-red-500")}
          {statCard("Contract Balance (ETH)", contractBalance, "border-green-500")}
          {statCard("Total Transactions", transactions.length, "border-blue-500")}
          {user?.role === "beneficiary" && statCard("Your Allocated (ETH)", myAllocated, "border-purple-500")}
        </div>

        {/* Active Disasters */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Active Disasters</h3>
            <Link to="/disasters" className="text-indigo-600 text-sm hover:underline">View all</Link>
          </div>
          {disasters.length === 0 ? (
            <p className="text-gray-400 text-sm">No active disasters.</p>
          ) : (
            <div className="space-y-3">
              {disasters.slice(0, 4).map((d) => (
                <div key={d._id} className="flex justify-between items-center border-b pb-3">
                  <div>
                    <p className="font-medium text-gray-800">{d.title}</p>
                    <p className="text-sm text-gray-500">{d.location} — <span className={`font-semibold ${d.severity === "critical" ? "text-red-600" : "text-orange-500"}`}>{d.severity}</span></p>
                  </div>
                  <Link
                    to={`/disasters/${d.disasterId}`}
                    className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-indigo-700"
                  >Donate</Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-sm">No transactions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Type</th><th className="pb-2">Amount (ETH)</th>
                <th className="pb-2">Disaster</th><th className="pb-2">Date</th>
              </tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} className="border-b last:border-0">
                    <td className="py-2 capitalize font-medium text-indigo-700">{tx.type}</td>
                    <td className="py-2">{tx.amount}</td>
                    <td className="py-2">{tx.disasterId}</td>
                    <td className="py-2 text-gray-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
