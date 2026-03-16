import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createDisaster } from "../services/api";
import toast from "react-hot-toast";

export default function NewDisaster() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    disasterId: "", title: "", description: "", location: "",
    lat: "", lng: "", severity: "medium", targetAmount: "", imageUrl: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        targetAmount: parseFloat(form.targetAmount),
        gpsCoordinates: form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : undefined,
      };
      await createDisaster(payload);
      toast.success("Disaster created!");
      navigate("/disasters");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create");
    } finally { setLoading(false); }
  };

  const f = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[key]} placeholder={placeholder} required={["disasterId","title","description","location","targetAmount"].includes(key)}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-indigo-700 text-white px-6 py-4">
        <Link to="/disasters" className="font-bold text-xl">SecureAidChain</Link>
      </nav>
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Disaster Campaign</h2>
        <div className="bg-white rounded-xl shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {f("Disaster ID (unique)", "disasterId", "text", "flood-2024-001")}
            {f("Title", "title", "text", "Flood Relief - Bangladesh")}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} required onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} placeholder="Describe the disaster and needs..."
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {f("Location", "location", "text", "Dhaka, Bangladesh")}
            <div className="grid grid-cols-2 gap-3">
              {f("Latitude", "lat", "number", "23.8103")}
              {f("Longitude", "lng", "number", "90.4125")}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {["low","medium","high","critical"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {f("Target Amount (ETH)", "targetAmount", "number", "10")}
            {f("Image URL (optional)", "imageUrl", "url", "https://...")}
            <button type="submit" disabled={loading}
              className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Campaign"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
