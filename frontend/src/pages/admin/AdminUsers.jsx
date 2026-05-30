import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Ban, Check } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "user", plan_id: "" });

  const load = async () => {
    const [u, p] = await Promise.all([api.get("/admin/users"), api.get("/admin/plans")]);
    setUsers(u.data);
    setPlans(p.data);
  };

  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/admin/users", { ...form, plan_id: form.plan_id || null });
      toast.success("User created");
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "user", plan_id: "" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const toggleBlock = async (u) => {
    await api.patch(`/admin/users/${u.id}`, { is_blocked: !u.is_blocked });
    toast.success(u.is_blocked ? "User unblocked" : "User blocked");
    load();
  };

  const assignPlan = async (u, plan_id) => {
    await api.patch(`/admin/users/${u.id}`, { plan_id: plan_id || null });
    toast.success("Plan updated");
    load();
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete ${u.email}? This removes their agents, calls and leads.`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success("User deleted");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Tenants"
        title="User Management"
        description="Create, suspend, and assign plans to client accounts."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-user-button" className="bg-slate-900 hover:bg-black"><Plus className="h-4 w-4 mr-2" /> New user</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create a new user</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="user-name-input" /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="user-email-input" /></div>
                <div className="space-y-2"><Label>Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required data-testid="user-password-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select value={form.plan_id || "none"} onValueChange={(v) => setForm({ ...form, plan_id: v === "none" ? "" : v })}>
                      <SelectTrigger data-testid="user-plan-select"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No plan</SelectItem>
                        {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="user-submit-button">Create</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title={`${users.length} users`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">User</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Role</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Plan</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                <TableCell><div className="font-semibold">{u.name}</div><div className="text-xs text-slate-500">{u.email}</div></TableCell>
                <TableCell><Badge variant="outline" className="uppercase text-[10px] tracking-widest">{u.role}</Badge></TableCell>
                <TableCell>
                  <Select value={u.plan_id || "none"} onValueChange={(v) => assignPlan(u, v === "none" ? "" : v)}>
                    <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No plan</SelectItem>
                      {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{u.is_blocked ? <Badge variant="destructive">Blocked</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}</TableCell>
                <TableCell className="text-right space-x-2">
                  {u.role !== "admin" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toggleBlock(u)} data-testid={`toggle-block-${u.id}`}>
                        {u.is_blocked ? <><Check className="h-3 w-3 mr-1" />Unblock</> : <><Ban className="h-3 w-3 mr-1" />Block</>}
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => remove(u)} data-testid={`delete-user-${u.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
