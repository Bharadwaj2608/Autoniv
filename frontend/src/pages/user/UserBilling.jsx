import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/Layout/PageBits";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function UserBilling() {
  const [billing, setBilling] = useState({ plan: null, minutes_used: 0, is_blocked: false });
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get("/billing").then((r) => setBilling(r.data));
    api.get("/plans").then((r) => setPlans(r.data));
  }, []);

  const limit = billing.plan?.monthly_minutes || 0;
  const pct = limit ? Math.min(100, (billing.minutes_used / limit) * 100) : 0;

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader eyebrow="Billing" title="Plan & Usage" description="Track your current plan and minute consumption." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
          <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-slate-500">Current plan</p>
          {billing.plan ? (
            <>
              <h2 className="font-display text-3xl font-black tracking-tighter mt-2" data-testid="current-plan-name">{billing.plan.name}</h2>
              <p className="text-slate-600 mt-1">${billing.plan.price_usd} / month · {billing.plan.monthly_minutes.toLocaleString()} minutes</p>
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-semibold">{billing.minutes_used.toFixed(2)} min used</span>
                  <span className="text-slate-500">{limit.toLocaleString()} min limit</span>
                </div>
                <Progress value={pct} className="h-3" />
                <p className="text-xs text-slate-500 mt-2">{(100 - pct).toFixed(1)}% remaining</p>
              </div>
            </>
          ) : (
            <p className="text-slate-600 mt-2">No plan assigned. Contact your administrator.</p>
          )}
        </div>

        <div className="space-y-4">
          <StatCard label="Minutes used" value={billing.minutes_used.toFixed(1)} accent="blue" />
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-slate-500">Account status</p>
            <p className="mt-2">{billing.is_blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}</p>
          </div>
        </div>
      </div>

      <SectionCard title="Available plans">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((p) => {
            const isCurrent = billing.plan?.id === p.id;
            return (
              <div key={p.id} className={`border rounded-lg p-5 ${isCurrent ? "border-blue-600 ring-1 ring-blue-600" : "border-slate-200"}`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-display font-bold text-lg">{p.name}</h4>
                  {isCurrent && <Badge className="bg-blue-600 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Current</Badge>}
                </div>
                <p className="font-display text-3xl font-black tracking-tighter">${p.price_usd}<span className="text-sm text-slate-500 font-medium">/mo</span></p>
                <p className="text-sm text-slate-600 mt-2">{p.monthly_minutes.toLocaleString()} minutes/mo</p>
                {p.description && <p className="text-xs text-slate-500 mt-3">{p.description}</p>}
              </div>
            );
          })}
          {plans.length === 0 && <p className="text-sm text-slate-500">No plans available.</p>}
        </div>
      </SectionCard>
    </div>
  );
}
