import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Power, Trash2, Plus } from "lucide-react";

const BLANK = { name: "", voice: "shimmer", model: "gpt-4o-mini", first_message: "Hello! How can I help you today?", system_prompt: "You are a helpful AI voice assistant." };

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [users, setUsers] = useState({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [a, u] = await Promise.all([api.get("/admin/agents"), api.get("/admin/users")]);
    setAgents(a.data);
    const map = {};
    u.data.forEach((x) => (map[x.id] = x));
    setUsers(map);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (a) => {
    await api.patch(`/admin/agents/${a.id}/disable`, null, { params: { disabled: !a.is_disabled } });
    toast.success(a.is_disabled ? "Agent enabled" : "Agent disabled");
    load();
  };

  const remove = async (a) => {
    if (!window.confirm("Delete this agent permanently?")) return;
    await api.delete(`/admin/agents/${a.id}`);
    toast.success("Agent deleted");
    load();
  };

  const openCreate = () => { setForm(BLANK); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/admin/agents", form);
      toast.success("Agent created");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <PageHeader eyebrow="Voice Fleet" title="All Agents" description="Every AI voice agent across all tenants." />
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Agent</Button>
      </div>

      <SectionCard title={`${agents.length} agents`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Agent</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Tenant</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Voice</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Vapi ID</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((a) => (
              <TableRow key={a.id} data-testid={`agent-row-${a.id}`}>
                <TableCell><div className="font-semibold">{a.name}</div><div className="text-xs text-slate-500 truncate max-w-xs">{a.system_prompt}</div></TableCell>
                <TableCell className="text-sm">{users[a.owner_id]?.email || (a.owner_id === "admin" ? "Admin" : "—")}</TableCell>
                <TableCell className="font-mono text-xs">{a.voice} / {a.model}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{a.vapi_assistant_id || "local"}</TableCell>
                <TableCell>{a.is_disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button size="sm" variant="outline" onClick={() => toggle(a)} data-testid={`toggle-agent-${a.id}`}><Power className="h-3 w-3 mr-1" />{a.is_disabled ? "Enable" : "Disable"}</Button>
                  <Button size="sm" variant="outline" className="text-red-600" onClick={() => remove(a)} data-testid={`delete-agent-${a.id}`}><Trash2 className="h-3 w-3" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {agents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-12">No agents yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Agent</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4 py-2">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Voice</Label>
                <Select value={form.voice} onValueChange={v => setForm(f => ({ ...f, voice: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["alloy","echo","fable","onyx","nova","shimmer"].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Model</Label>
                <Select value={form.model} onValueChange={v => setForm(f => ({ ...f, model: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["gpt-4o-mini","gpt-4o","gpt-3.5-turbo"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>First Message</Label>
              <Input value={form.first_message} onChange={e => setForm(f => ({ ...f, first_message: e.target.value }))} />
            </div>
            <div>
              <Label>System Prompt</Label>
              <Textarea rows={4} value={form.system_prompt} onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating…" : "Create Agent"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}