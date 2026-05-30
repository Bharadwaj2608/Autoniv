import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/api";
import { Loader2, Mic } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@autoniv.com");
  const [password, setPassword] = useState("admin123");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await login(email, password);
      navigate(u.role === "admin" ? "/admin" : "/app");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-white">
      {/* Left: form */}
      <div className="flex flex-col justify-between p-8 lg:p-14">
        <div className="flex items-center gap-3">
          <img src={BRAND.logo} alt="Autoniv" className="h-9 w-9 object-contain" />
          <span className="font-display font-bold text-xl tracking-tight">Autoniv</span>
        </div>

        <div className="max-w-md w-full mx-auto lg:mx-0 lg:ml-8 my-12">
          <p className="text-xs tracking-[0.2em] uppercase font-bold text-slate-500 mb-3">Voice Operations</p>
          <h1 className="font-display text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 mb-3">
            Welcome back.
          </h1>
          <p className="text-slate-600 mb-10">
            Sign in to manage your AI voice agents, monitor live calls, and track usage.
          </p>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs tracking-widest uppercase font-bold text-slate-500">Email</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="h-12 rounded-md border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs tracking-widest uppercase font-bold text-slate-500">Password</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="h-12 rounded-md border-slate-200 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              />
            </div>

            {err && <p data-testid="login-error" className="text-sm text-red-600">{err}</p>}

            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={busy}
              className="w-full h-12 bg-slate-900 text-white hover:bg-black rounded-md font-semibold"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>

            <div className="text-sm text-slate-600 pt-2">
              New here? <Link to="/register" data-testid="register-link" className="text-blue-600 font-semibold hover:underline">Create an account</Link>
            </div>

            <div className="mt-8 rounded-md border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900 flex items-center gap-2"><Mic className="h-3.5 w-3.5" /> Demo credentials</p>
              <p><span className="font-mono">admin@autoniv.com</span> / <span className="font-mono">admin123</span></p>
              <p><span className="font-mono">demo@clinic.com</span> / <span className="font-mono">demo123</span></p>
            </div>
          </form>
        </div>

        <p className="text-xs text-slate-400">© 2026 Autoniv. Voice Intelligence Platform.</p>
      </div>

      {/* Right: visual */}
      <div className="hidden lg:block relative overflow-hidden">
        <img src={BRAND.loginBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-blue-100/30" />
        <div className="relative h-full flex flex-col justify-end p-12">
          <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-lg p-6 max-w-sm shadow-lg">
            <p className="text-xs tracking-[0.2em] uppercase font-bold text-blue-600 mb-2">Live Ops</p>
            <h3 className="font-display text-2xl font-bold text-slate-900 mb-2">Voice agents, on autopilot.</h3>
            <p className="text-sm text-slate-600">Spin up AI voice agents, route calls, and capture leads — all from a single command center.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
