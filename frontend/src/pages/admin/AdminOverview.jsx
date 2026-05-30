import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminOverview() {
  const [usage, setUsage] = useState({ rows: [], totals: { users: 0, agents: 0, calls: 0, minutes: 0 } });
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    api.get("/admin/usage").then((r) => setUsage(r.data));
    api.get("/admin/calls").then((r) => setCalls(r.data.slice(0, 8)));
  }, []);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="Platform Control"
        title="Operations Overview"
        description="Live snapshot of every tenant, agent, and call across Autoniv."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tenants" value={usage.totals.users} sub="Active client accounts" />
        <StatCard label="Voice Agents" value={usage.totals.agents} sub="Deployed across tenants" accent="blue" />
        <StatCard label="Total Calls" value={usage.totals.calls} sub="All-time" accent="green" />
        <StatCard label="Minutes Used" value={usage.totals.minutes.toFixed(1)} sub="Aggregate consumption" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Top tenants by usage">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] tracking-widest uppercase">Tenant</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase text-right">Calls</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase text-right">Minutes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.rows.slice(0, 6).map((r) => (
                <TableRow key={r.user_id} data-testid={`usage-row-${r.user_id}`}>
                  <TableCell className="font-medium">{r.name}<div className="text-xs text-slate-500">{r.email}</div></TableCell>
                  <TableCell className="text-right font-mono">{r.total_calls}</TableCell>
                  <TableCell className="text-right font-mono">{r.minutes_used.toFixed(1)}</TableCell>
                </TableRow>
              ))}
              {usage.rows.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500 py-8">No usage yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard title="Recent calls">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] tracking-widest uppercase">When</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.started_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right font-mono">{(c.duration_seconds / 60).toFixed(1)}m</TableCell>
                </TableRow>
              ))}
              {calls.length === 0 && (
                <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500 py-8">No calls yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
    missed: "bg-amber-100 text-amber-700 border-amber-200",
    failed: "bg-red-100 text-red-700 border-red-200",
    "in-progress": "bg-blue-100 text-blue-700 border-blue-200",
  };
  return <Badge variant="outline" className={`${map[status] || "bg-slate-100 text-slate-700"} font-mono text-[10px] uppercase tracking-wider`}>{status}</Badge>;
}
