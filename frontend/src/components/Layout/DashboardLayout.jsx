import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { BRAND } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Bot, PhoneCall, BarChart3, CreditCard,
  Contact, LogOut, Activity, CalendarCheck, HelpCircle, PhoneIncoming, CalendarCheck2,
} from "lucide-react";

const adminNav = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/agents", label: "Agents", icon: Bot },
  { to: "/app/leads", label: "Leads", icon: Contact },
  { to: "/app/appointments", label: "Appointments", icon: CalendarCheck2 },
  { to: "/admin/calls", label: "Calls", icon: PhoneCall },
  { to: "/admin/usage", label: "Usage", icon: Activity },
  { to: "/admin/billing", label: "Billing", icon: CreditCard },
];

const userNav = [
  { to: "/app", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/app/agents", label: "Agents", icon: Bot },
  { to: "/app/leads", label: "Leads", icon: Contact },
  { to: "/app/appointments", label: "Appointments", icon: CalendarCheck },
  { to: "/app/faq", label: "FAQ Base", icon: HelpCircle },
  { to: "/app/calls", label: "Calls", icon: PhoneCall },
  { to: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/app/billing", label: "Billing", icon: CreditCard },
];

export default function DashboardLayout({ mode = "user" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = mode === "admin" ? adminNav : userNav;

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-200">
          <img src={BRAND.logo} alt="Autoniv" className="h-8 w-8 object-contain" />
          <div>
            <div className="font-display font-bold text-base leading-none">Autoniv</div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-slate-500 mt-1">
              {mode === "admin" ? "Admin Console" : "Client Dashboard"}
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1" data-testid="sidebar-nav">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              data-testid={`nav-${item.label.toLowerCase()}`}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-slate-50 mb-2">
            <div className="h-8 w-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold uppercase">
              {(user?.name || "U").slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" data-testid="current-user-name">{user?.name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onLogout}
            data-testid="logout-button"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
