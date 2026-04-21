import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Disasters from "./pages/Disasters";
import DisasterDetail from "./pages/DisasterDetail";
import NewDisaster from "./pages/NewDisaster";
import Admin from "./pages/Admin";
import { loadContractInfo } from "./services/blockchain";
import { useEffect } from "react";

function PrivateRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  useEffect(() => { loadContractInfo(); }, []);

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/disasters" element={<PrivateRoute><Disasters /></PrivateRoute>} />
      <Route path="/disasters/new" element={<PrivateRoute roles={["admin","ngo","government"]}><NewDisaster /></PrivateRoute>} />
      <Route path="/disasters/:id" element={<PrivateRoute><DisasterDetail /></PrivateRoute>} />
      <Route path="/admin" element={<PrivateRoute roles={["admin"]}><Admin /></PrivateRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
