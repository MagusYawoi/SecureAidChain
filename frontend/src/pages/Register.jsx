import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../services/api";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

const ROLES = ["donor", "beneficiary", "ngo", "government", "agency"];

const PASSWORD_RULES = [
  { label: "8+ characters", test: (p) => p.length >= 8 },
  { label: "Uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "Digit", test: (p) => /[0-9]/.test(p) },
  { label: "Special character", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "donor", walletAddress: "", location: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const ruleResults = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(form.password) }));
  const passedCount = ruleResults.filter((r) => r.passed).length;
  const passwordStrong = passedCount === PASSWORD_RULES.length;
  const strengthPct = (passedCount / PASSWORD_RULES.length) * 100;
  const strengthColor = passedCount <= 2 ? "#dc2626" : passedCount <= 4 ? "#d97706" : "#16a34a";
  const strengthLabel = passedCount <= 2 ? "Weak" : passedCount <= 4 ? "Moderate" : "Strong";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!passwordStrong) return toast.error("Password does not meet all requirements");
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

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";

  const field = (label, key, type = "text", placeholder = "") => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type} value={form[key]} placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputCls}
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-900 py-10">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-indigo-700 mb-6">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          {field("Full Name", "name", "text", "Full Name")}
          {field("Email", "email", "email", "Email")}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password" value={form.password} placeholder="••••••••"
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={inputCls}
            />

            {form.password && (
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-500">Strength</span>
                  <span className="text-xs font-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded overflow-hidden">
                  <div className="h-full rounded transition-all duration-300" style={{ width: `${strengthPct}%`, background: strengthColor }} />
                </div>
                <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                  {ruleResults.map((r) => (
                    <li key={r.label} className="text-xs flex items-center gap-1" style={{ color: r.passed ? "#16a34a" : "#9ca3af" }}>
                      <span>{r.passed ? "✓" : "○"}</span> {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          {field("Wallet Address (optional)", "walletAddress", "text", "0x...")}
          {field("Location", "location", "text", "City, Country")}
          {field("Phone", "phone", "tel", "+1234567890")}
          <button
            type="submit" disabled={loading || !passwordStrong}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
