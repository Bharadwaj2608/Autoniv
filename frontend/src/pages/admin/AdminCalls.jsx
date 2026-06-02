import { useEffect, useState } from "react";
import { api ,API} from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "./AdminOverview";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function AdminCalls() {
  const [calls, setCalls] = useState([]);
  const [users, setUsers] = useState({});
  const [agents, setAgents] = useState({});

  useEffect(() => {
    Promise.all([api.get("/admin/calls"), api.get("/admin/users"), api.get("/admin/agents")]).then(([c, u, a]) => {
      setCalls(c.data);
      const um = {}; u.data.forEach((x) => (um[x.id] = x)); setUsers(um);
      const am = {}; a.data.forEach((x) => (am[x.id] = x)); setAgents(am);
    });
  }, []);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
     <PageHeader
        eyebrow="Telephony"
        title="Call Monitor"
        description="Every call recorded across the platform, synced from Vapi."
        action={
          <Button
            variant="outline"
            onClick={() => window.open(`${API}/admin/calls/export`, "_blank")}
            data-testid="export-admin-calls-csv"
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
        }
      />
      <SectionCard title={`${calls.length} calls`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Started</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Tenant</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Agent</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Caller</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Duration</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase">Recording</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calls.map((c) => (
              <TableRow key={c.id} data-testid={`call-row-${c.id}`}>
                <TableCell className="text-xs whitespace-nowrap">{new Date(c.started_at).toLocaleString()}</TableCell>
                <TableCell className="text-sm">{users[c.user_id]?.email || "—"}</TableCell>
                <TableCell className="text-sm">{agents[c.agent_id]?.name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{c.caller_number || "—"}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-right font-mono">{(c.duration_seconds / 60).toFixed(2)}m</TableCell>
                <TableCell>{c.recording_url ? <audio controls src={c.recording_url} className="h-8 max-w-[180px]" /> : <span className="text-xs text-slate-400">—</span>}</TableCell>
              </TableRow>
            ))}
            {calls.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-slate-500 py-12">No calls yet. Configure Vapi webhooks to start receiving events.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
