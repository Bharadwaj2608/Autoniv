import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../admin/AdminOverview";

export default function UserCalls() {
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState({});

  useEffect(() => {
    Promise.all([api.get("/calls"), api.get("/agents")]).then(([c, a]) => {
      setCalls(c.data);
      const m = {}; a.data.forEach((x) => (m[x.id] = x)); setAgents(m);
    });
  }, []);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader eyebrow="History" title="Call History" description="Every call handled by your AI voice agents." />
      <SectionCard title={`${calls.length} calls`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Started</TableHead>
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
                <TableCell>{agents[c.agent_id]?.name || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{c.caller_number || "—"}</TableCell>
                <TableCell><StatusBadge status={c.status} /></TableCell>
                <TableCell className="text-right font-mono">{(c.duration_seconds / 60).toFixed(2)}m</TableCell>
                <TableCell>{c.recording_url ? <audio controls src={c.recording_url} className="h-8 max-w-[180px]" /> : <span className="text-xs text-slate-400">—</span>}</TableCell>
              </TableRow>
            ))}
            {calls.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-12">No calls yet. Configure your Vapi webhook to <code className="font-mono">/api/vapi/webhook</code>.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
