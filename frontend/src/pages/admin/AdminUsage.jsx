import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function AdminUsage() {
  const [data, setData] = useState({ rows: [], totals: { users: 0, agents: 0, calls: 0, minutes: 0 } });

  useEffect(() => { api.get("/admin/usage").then((r) => setData(r.data)); }, []);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader eyebrow="Consumption" title="Usage Tracking" description="Per-tenant minutes consumed and call volume." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Tenants" value={data.totals.users} />
        <StatCard label="Agents" value={data.totals.agents} accent="blue" />
        <StatCard label="Total Calls" value={data.totals.calls} accent="green" />
        <StatCard label="Minutes" value={data.totals.minutes.toFixed(1)} />
      </div>

      <SectionCard title="Per-tenant breakdown">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[10px] tracking-widest uppercase">Tenant</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Calls</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Completed</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Missed</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase text-right">Minutes</TableHead>
              <TableHead className="text-[10px] tracking-widest uppercase w-48">Quota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.map((r) => {
              const pct = Math.min(100, (r.minutes_used / 500) * 100);
              return (
                <TableRow key={r.user_id}>
                  <TableCell><div className="font-semibold">{r.name}</div><div className="text-xs text-slate-500">{r.email}</div></TableCell>
                  <TableCell className="text-right font-mono">{r.total_calls}</TableCell>
                  <TableCell className="text-right font-mono text-emerald-700">{r.completed}</TableCell>
                  <TableCell className="text-right font-mono text-amber-700">{r.missed}</TableCell>
                  <TableCell className="text-right font-mono">{r.minutes_used.toFixed(2)}</TableCell>
                  <TableCell><Progress value={pct} className="h-2" /></TableCell>
                </TableRow>
              );
            })}
            {data.rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-slate-500 py-12">No usage data.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
