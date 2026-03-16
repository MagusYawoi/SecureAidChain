import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDisasters } from "../services/api";
import { useAuth } from "../context/AuthContext";

const SEVERITY_COLORS = { low: "bg-green-100 text-green-700", medium: "bg-yellow-100 text-yellow-700", high: "bg-orange-100 text-orange-700", critical: "bg-red-100 text-red-700" };

export default function Disasters() {
  const { user } = useAuth();
  const [disasters, setDisasters] = useState([]);
  const [filter, setFilter] = useState({ status: "", severity: "" });

  useEffect(() => {
    getDisasters(filter).then((r) => setDisasters(r.data)).catch(() => {});
  }, [filter]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white px-6 py-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">SecureAidChain</h1>
        <div className="flex gap-4 text-sm">
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          {(user?.role === "admin" || user?.role === "ngo") && (
            <Link to="/disasters/new" className="bg-white text-indigo-700 px-3 py-1 rounded font-medium">+ New Disaster</Link>
          )}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Disaster Relief Campaigns</h2>
          <div className="flex gap-3">
            <select value={filter.status} onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
              <option value="pending">Pending</option>
            </select>
            <select value={filter.severity} onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Severity</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {disasters.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No disasters found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disasters.map((d) => (
              <div key={d._id} className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden">
                {d.imageUrl && <img src={d.imageUrl} alt={d.title} className="w-full h-40 object-cover" />}
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-800 text-lg">{d.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${SEVERITY_COLORS[d.severity]}`}>{d.severity}</span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{d.location}</p>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{d.description}</p>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{d.collectedAmount} ETH raised</span>
                      <span>Goal: {d.targetAmount} ETH</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${Math.min((d.collectedAmount / d.targetAmount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    to={`/disasters/${d.disasterId}`}
                    className="block text-center bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                  >View & Donate</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
