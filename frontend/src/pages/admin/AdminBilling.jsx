import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export default function AdminBilling() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", monthly_minutes: 500, price_usd: 49, description: "" });

  const load = async () => {
    const r = await api.get("/admin/plans");
    setPlans(r.data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/plans", { ...form, monthly_minutes: Number(form.monthly_minutes), price_usd: Number(form.price_usd) });
      toast.success("Plan created");
      setOpen(false);
      setForm({ name: "", monthly_minutes: 500, price_usd: 49, description: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete plan "${p.name}"?`)) return;
    await api.delete(`/admin/plans/${p.id}`);
    toast.success("Plan removed");
    load();
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Pricing"
        title="Billing & Plans"
        description="Define pricing tiers and assign them to tenants."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-slate-900 hover:bg-black" data-testid="create-plan-button"><Plus className="h-4 w-4 mr-2" />New plan</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create plan</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="plan-name-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Monthly minutes</Label><Input type="number" value={form.monthly_minutes} onChange={(e) => setForm({ ...form, monthly_minutes: e.target.value })} required data-testid="plan-minutes-input" /></div>
                  <div className="space-y-2"><Label>Price (USD)</Label><Input type="number" step="0.01" value={form.price_usd} onChange={(e) => setForm({ ...form, price_usd: e.target.value })} required data-testid="plan-price-input" /></div>
                </div>
                <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <DialogFooter><Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="plan-submit-button">Create</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => (
          <SectionCard key={p.id} title={p.name} action={<Button size="sm" variant="ghost" className="text-red-600" onClick={() => remove(p)} data-testid={`delete-plan-${p.id}`}><Trash2 className="h-3 w-3" /></Button>}>
            <p className="font-display text-4xl font-black tracking-tighter">${p.price_usd}<span className="text-base text-slate-500 font-medium">/mo</span></p>
            <p className="text-sm text-slate-600 mt-2">{p.monthly_minutes.toLocaleString()} minutes / month</p>
            {p.description && <p className="text-xs text-slate-500 mt-3">{p.description}</p>}
          </SectionCard>
        ))}
        {plans.length === 0 && <p className="text-sm text-slate-500">No plans yet.</p>}
      </div>
    </div>
  );
}
