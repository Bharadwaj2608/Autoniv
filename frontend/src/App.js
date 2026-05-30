import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import DashboardLayout from "@/components/Layout/DashboardLayout";

import AdminOverview from "@/pages/admin/AdminOverview";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminAgents from "@/pages/admin/AdminAgents";
import AdminCalls from "@/pages/admin/AdminCalls";
import AdminUsage from "@/pages/admin/AdminUsage";
import AdminBilling from "@/pages/admin/AdminBilling";

import UserOverview from "@/pages/user/UserOverview";
import UserAgents from "@/pages/user/UserAgents";
import UserCalls from "@/pages/user/UserCalls";
import UserAnalytics from "@/pages/user/UserAnalytics";
import UserLeads from "@/pages/user/UserLeads";
import UserBilling from "@/pages/user/UserBilling";
import UserAppointments from "@/pages/user/UserAppointments";
import UserFAQ from "@/pages/user/UserFAQ";
import { Loader2 } from "lucide-react";

function Protected({ children, role }) {
  const { user } = useAuth();
  if (user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === "admin" && user.role !== "admin") return <Navigate to="/app" replace />;
  if (role === "user" && user.role === "admin") return <Navigate to="/admin" replace />;
  return children;
}

function RootRedirect() {
  const { user } = useAuth();
  if (user === null) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === "admin" ? "/admin" : "/app"} replace />;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <Protected role="admin">
                  <DashboardLayout mode="admin" />
                </Protected>
              }
            >
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="agents" element={<AdminAgents />} />
              <Route path="calls" element={<AdminCalls />} />
              <Route path="usage" element={<AdminUsage />} />
              <Route path="billing" element={<AdminBilling />} />
            </Route>

            {/* User */}
            <Route
              path="/app"
              element={
                <Protected role="user">
                  <DashboardLayout mode="user" />
                </Protected>
              }
            >
              <Route index element={<UserOverview />} />
              <Route path="agents" element={<UserAgents />} />
              <Route path="calls" element={<UserCalls />} />
              <Route path="analytics" element={<UserAnalytics />} />
              <Route path="leads" element={<UserLeads />} />
              <Route path="appointments" element={<UserAppointments />} />
              <Route path="faq" element={<UserFAQ />} />
              <Route path="billing" element={<UserBilling />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
