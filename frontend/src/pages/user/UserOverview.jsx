import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../admin/AdminOverview";

export default function UserOverview() {
  const [analytics, setAnalytics] = useState({ summary: { total_calls: 0, total_minutes: 0, completed: 0, missed: 0 }, daily: [] });
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);

  useEffect(() => {
    api.get("/analytics").then((r) => setAnalytics(r.data));
    api.get("/agents").then((r) => setAgents(r.data));
    api.get("/calls").then((r) => setCalls(r.data.slice(0, 6)));
  }, []);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader eyebrow="Your Workspace" title="Command Center" description="Monitor your voice agents and call activity in real time." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Agents" value={agents.filter((a) => !a.is_disabled).length} sub={`${agents.length} total`} />
        <StatCard label="Total Calls" value={analytics.summary.total_calls} accent="blue" />
        <StatCard label="Completed" value={analytics.summary.completed} accent="green" />
        <StatCard label="Minutes Used" value={analytics.summary.total_minutes.toFixed(1)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="My Agents">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px] tracking-widest uppercase">Name</TableHead><TableHead className="text-[10px] tracking-widest uppercase">Voice</TableHead><TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {agents.slice(0, 6).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-semibold">{a.name}</TableCell>
                  <TableCell className="font-mono text-xs">{a.voice}</TableCell>
                  <TableCell>{a.is_disabled ? <span className="text-xs text-red-600">disabled</span> : <span className="text-xs text-emerald-600">active</span>}</TableCell>
                </TableRow>
              ))}
              {agents.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500 py-8">Create your first agent to get started.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard title="Recent calls">
          <Table>
            <TableHeader><TableRow><TableHead className="text-[10px] tracking-widest uppercase">When</TableHead><TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead><TableHead className="text-[10px] tracking-widest uppercase text-right">Duration</TableHead></TableRow></TableHeader>
            <TableBody>
              {calls.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-xs">{new Date(c.started_at).toLocaleString()}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right font-mono">{(c.duration_seconds / 60).toFixed(1)}m</TableCell>
                </TableRow>
              ))}
              {calls.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-slate-500 py-8">No calls yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </SectionCard>
      </div>
    </div>
  );
}
