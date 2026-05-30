import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const STATUSES = ["new", "contacted", "converted", "lost"];
const statusColor = { new: "bg-blue-100 text-blue-700", contacted: "bg-amber-100 text-amber-700", converted: "bg-emerald-100 text-emerald-700", lost: "bg-slate-100 text-slate-700" };

export default function UserLeads() {
  const [leads, setLeads] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", status: "new" });

  const load = async () => setLeads((await api.get("/leads")).data);
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/leads", form);
      toast.success("Lead added");
      setOpen(false);
      setForm({ name: "", phone: "", email: "", notes: "", status: "new" });
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const updateStatus = async (l, status) => {
    await api.patch(`/leads/${l.id}`, { status });
    toast.success("Lead updated");
    load();
  };

  const remove = async (l) => {
    if (!window.confirm("Delete this lead?")) return;
    await api.delete(`/leads/${l.id}`);
    toast.success("Lead removed");
    load();
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Pipeline"
        title="Leads"
        description="Customer details captured by your voice agents."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="bg-slate-900 hover:bg-black" data-testid="create-lead-button"><Plus className="h-4 w-4 mr-2" />Add lead</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add lead</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="lead-name-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="lead-phone-input" /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="lead-email-input" /></div>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="lead-notes-input" /></div>
                <DialogFooter><Button type="submit" className="bg-slate-900 hover:bg-black" data-testid="lead-submit-button">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <SectionCard title={`${leads.length} leads`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Name</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Phone</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Email</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Notes</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l.id} data-testid={`lead-row-${l.id}`}>
                <TableCell className="font-semibold">{l.name}</TableCell>
                <TableCell className="font-mono text-xs">{l.phone || "—"}</TableCell>
                <TableCell className="text-xs">{l.email || "—"}</TableCell>
                <TableCell className="text-xs text-slate-600 max-w-xs truncate">{l.notes || "—"}</TableCell>
                <TableCell>
                  <Select value={l.status} onValueChange={(v) => updateStatus(l, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs"><Badge variant="outline" className={`${statusColor[l.status]} uppercase text-[10px]`}>{l.status}</Badge></SelectTrigger>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(l)} data-testid={`delete-lead-${l.id}`}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {leads.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-12">No leads yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
