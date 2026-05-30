import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/lib/api";
import { Loader2 } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const u = await register(name, email, password);
      navigate(u.role === "admin" ? "/admin" : "/app");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <img src={BRAND.logo} alt="Autoniv" className="h-9 w-9 object-contain" />
          <span className="font-display font-bold text-xl">Autoniv</span>
        </div>
        <h1 className="font-display text-3xl font-black tracking-tighter mb-2">Create your account</h1>
        <p className="text-sm text-slate-600 mb-8">Start deploying AI voice agents in minutes.</p>

        <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" data-testid="register-name-input" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" data-testid="register-email-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" data-testid="register-password-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {err && <p data-testid="register-error" className="text-sm text-red-600">{err}</p>}

          <Button type="submit" data-testid="register-submit-button" disabled={busy} className="w-full h-11 bg-slate-900 hover:bg-black text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
          </Button>

          <p className="text-sm text-slate-600 text-center pt-2">
            Already have an account? <Link to="/login" className="text-blue-600 font-semibold">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
