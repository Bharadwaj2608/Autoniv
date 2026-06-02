import { useEffect, useState, useMemo } from "react";
import { api, formatApiError } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit3, CalendarCheck2 } from "lucide-react";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const statusColor = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const emptyForm = {
  customer_name: "", contact: "", email: "", address: "",
  scheduled_at: "", service: "", notes: "", status: "pending",
};

export default function UserAppointments() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, confirmed: 0, cancelled: 0 });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    try {
      const [a, s] = await Promise.all([
        api.get("/appointments"),
        api.get("/appointments/stats"),
      ]);
      setItems(a.data || []);
      setStats(s.data || { total: 0, pending: 0, confirmed: 0, cancelled: 0 });
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    }
  };

  useEffect(() => { load(); }, []);

  // UI State Handlers
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    // Convert backend ISO strings to local datetime-local compatible string (YYYY-MM-DDTHH:MM)
    let localDatetime = "";
    if (a.scheduled_at) {
      const d = new Date(a.scheduled_at);
      if (!Number.isNaN(d.getTime())) {
        localDatetime = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
    }

    setForm({
      customer_name: a.customer_name || "",
      contact: a.contact || "",
      email: a.email || "",
      address: a.address || "",
      scheduled_at: localDatetime,
      service: a.service || "",
      notes: a.notes || "",
      status: a.status || "pending",
    });
    setOpen(true);
  };

  // Mutators
  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };

      if (editing) {
        await api.patch(`/appointments/${editing.id}`, payload);
        toast.success("Appointment updated");
      } else {
        await api.post("/appointments", payload);
        toast.success("Appointment created");
      }
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const updateStatus = async (a, status) => {
    try {
      await api.patch(`/appointments/${a.id}`, { status });
      toast.success("Status updated");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete appointment for "${a.customer_name}"?`)) return;
    try {
      await api.delete(`/appointments/${a.id}`);
      toast.success("Appointment removed");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  // Helper dynamic handlers & formatters
  const handleFieldChange = (key) => (v) => {
    const val = typeof v === "string" ? v : v.target.value;
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const fmtWhen = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  };

  // Filtered array computed values
  const displayedItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((i) => i.status === filter);
  }, [items, filter]);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Bookings"
        title="Appointments"
        description="All appointments booked by your AI agents, with full customer details."
        action={
          <Button onClick={openCreate} className="bg-slate-900 hover:bg-black" data-testid="create-appointment-button">
            <Plus className="h-4 w-4 mr-2" /> New Appointment
          </Button>
        }
      />

      {/* Stats Cards rendered as dynamic filter triggers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", key: "all", value: stats.total, accent: null },
          { label: "Pending", key: "pending", value: stats.pending, accent: "amber" },
          { label: "Confirmed", key: "confirmed", value: stats.confirmed, accent: "green" },
          { label: "Cancelled", key: "cancelled", value: stats.cancelled, accent: "red" }
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key)}
            className="w-full text-left focus:outline-none focus:ring-2 focus:ring-slate-400 rounded-xl"
          >
            <StatCard 
              label={s.label} 
              value={s.value} 
              accent={filter === s.key ? s.accent || "blue" : undefined}
              className={`transition-all duration-200 ${filter === s.key ? "ring-2 ring-slate-900 ring-offset-2 scale-[1.02]" : "opacity-80 hover:opacity-100"}`}
            />
          </button>
        ))}
      </div>

      <SectionCard title="Appointments" subtitle={`Showing ${displayedItems.length} records`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Customer</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Contact</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Address</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Service</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Scheduled</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedItems.map((a) => (
              <TableRow key={a.id} data-testid={`appointment-row-${a.id}`}>
                <TableCell>
                  <div className="font-semibold">{a.customer_name}</div>
                  {a.email && <div className="text-xs text-slate-500">{a.email}</div>}
                </TableCell>
                <TableCell className="font-mono text-xs">{a.contact || "—"}</TableCell>
                <TableCell className="text-xs text-slate-700 max-w-[200px] truncate">{a.address || "—"}</TableCell>
                <TableCell className="text-xs">{a.service || "—"}</TableCell>
                <TableCell className="text-xs whitespace-nowrap">{fmtWhen(a.scheduled_at)}</TableCell>
                <TableCell>
                  <Select value={a.status} onValueChange={(v) => updateStatus(a, v)}>
                    <SelectTrigger className="h-8 w-32 text-xs" data-testid={`appointment-status-${a.id}`}>
                      <Badge variant="outline" className={`${statusColor[a.status] || ""} uppercase text-[10px]`}>
                        {a.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600"
                      onClick={() => remove(a)} data-testid={`delete-appointment-${a.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {displayedItems.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <CalendarCheck2 className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">
                    No appointments yet. Your booking agent will populate this automatically.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </SectionCard>

      {/* Controlled Dialog Structure Handling both Create and Edit operations */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Appointment" : "New appointment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <Label>Customer name</Label>
              <Input value={form.customer_name}
                onChange={handleFieldChange("customer_name")}
                required data-testid="appointment-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={form.contact}
                  onChange={handleFieldChange("contact")}
                  placeholder="+1 555 123 4567"
                  data-testid="appointment-contact-input" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email}
                  onChange={handleFieldChange("email")}
                  data-testid="appointment-email-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={form.address}
                onChange={handleFieldChange("address")}
                placeholder="Street, City, ZIP"
                data-testid="appointment-address-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Scheduled at</Label>
                <Input type="datetime-local" value={form.scheduled_at}
                  onChange={handleFieldChange("scheduled_at")}
                  data-testid="appointment-time-input" />
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Input value={form.service}
                  onChange={handleFieldChange("service")}
                  placeholder="Consultation, Demo, …"
                  data-testid="appointment-service-input" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes}
                onChange={handleFieldChange("notes")}
                data-testid="appointment-notes-input" />
            </div>
            {editing && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={handleFieldChange("status")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-slate-900 hover:bg-black"
                data-testid="appointment-submit-button">
                {editing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}