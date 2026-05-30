import { useEffect, useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, CalendarCheck, Clock, User, Phone } from "lucide-react";

const SERVICES = [
  "General Consultation", "Dental Checkup", "Follow-up Visit",
  "Lab Test", "Physiotherapy", "Vaccination", "Other",
];

const STATUS_COLORS = {
  pending:   "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

const empty = {
  caller_name: "", caller_phone: "", service_type: "General Consultation",
  preferred_date: "", preferred_time: "", status: "pending", notes: "",
};

export default function UserAppointments() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(empty);
  const [filter, setFilter] = useState("all");

  const load = async () => setItems((await api.get("/appointments")).data);
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      caller_name: a.caller_name, caller_phone: a.caller_phone || "",
      service_type: a.service_type, preferred_date: a.preferred_date,
      preferred_time: a.preferred_time, status: a.status, notes: a.notes || "",
    });
    setOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.patch(`/appointments/${editing.id}`, form);
        toast.success("Appointment updated");
      } else {
        await api.post("/appointments", form);
        toast.success("Appointment booked");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete appointment for "${a.caller_name}"?`)) return;
    await api.delete(`/appointments/${a.id}`);
    toast.success("Deleted");
    load();
  };

  const f = (k) => (v) => setForm((p) => ({ ...p, [k]: typeof v === "string" ? v : v.target.value }));

  const displayed = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    confirmed: items.filter((i) => i.status === "confirmed").length,
    cancelled: items.filter((i) => i.status === "cancelled").length,
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Appointments"
        subtitle="Bookings captured by your Appointment Agent"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" /> New Appointment
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {["all", "pending", "confirmed", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-xl border p-4 text-left transition-all ${
              filter === s ? "border-slate-900 bg-slate-900 text-white" : "bg-white hover:border-slate-300"
            }`}
          >
            <div className="text-2xl font-bold">{counts[s]}</div>
            <div className="text-xs capitalize mt-0.5 opacity-70">{s === "all" ? "Total" : s}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <SectionCard title="Appointments" subtitle={`Showing ${displayed.length} records`}>
        {displayed.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CalendarCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No appointments yet. Your booking agent will populate this automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wide">
                  <th className="text-left py-3 pr-4">Caller</th>
                  <th className="text-left py-3 pr-4">Service</th>
                  <th className="text-left py-3 pr-4">Date & Time</th>
                  <th className="text-left py-3 pr-4">Status</th>
                  <th className="py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{a.caller_name}</div>
                      {a.caller_phone && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{a.caller_phone}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-600">{a.service_type}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <CalendarCheck className="h-3.5 w-3.5" />
                        {a.preferred_date}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {a.preferred_time}
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] || ""}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)}>
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => remove(a)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Appointment" : "New Appointment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Caller Name</Label>
                <Input value={form.caller_name} onChange={f("caller_name")} placeholder="Full name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.caller_phone} onChange={f("caller_phone")} placeholder="+1 555 ..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Service Type</Label>
              <Select value={form.service_type} onValueChange={f("service_type")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Preferred Date</Label>
                <Input type="date" value={form.preferred_date} onChange={f("preferred_date")} required />
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Time</Label>
                <Input type="time" value={form.preferred_time} onChange={f("preferred_time")} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={f("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["pending", "confirmed", "cancelled"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={f("notes")} placeholder="Optional notes" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit">{editing ? "Save" : "Book"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
