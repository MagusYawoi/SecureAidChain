import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ROLES = ["donor", "beneficiary", "ngo"];

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "donor", walletAddress: "", location: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await register(form);
      loginUser(data.token, data.user);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={form[key]} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field("Full Name", "name", "text", "John Doe")}
          {field("Email", "email", "email", "you@example.com")}
          {field("Password", "password", "password", "••••••••")}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          {field("Wallet Address (optional)", "walletAddress", "text", "0x...")}
          {field("Location", "location", "text", "City, Country")}
          {field("Phone", "phone", "tel", "+1234567890")}
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 hover:underline font-medium">Login</Link>
        </p>
      </div>
    </div>
  );
}
