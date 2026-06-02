import { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard, StatCard } from "@/components/Layout/PageBits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "../admin/AdminOverview";
import { Input } from "@/components/ui/input";

export default function UserCalls() {
  const [calls, setCalls] = useState([]);
  const [agents, setAgents] = useState({});
  const [q, setQ] = useState("");

  useEffect(() => {
    Promise.all([api.get("/calls"), api.get("/agents")])
      .then(([c, a]) => {
        setCalls(c.data || []);
        const m = {};
        if (Array.isArray(a.data)) {
          a.data.forEach((x) => {
            if (x && x.id) m[x.id] = x;
          });
        }
        setAgents(m);
      })
      .catch((err) => {
        console.error("Failed to fetch data:", err);
      });
  }, []);

  // Performance Optimization: Memoize filtering logic
  const filtered = useMemo(() => {
    if (!q) return calls;
    const s = q.toLowerCase();
    return calls.filter((c) => {
      return (
        (c.customer_name || "").toLowerCase().includes(s) ||
        (c.caller_number || "").toLowerCase().includes(s) ||
        (c.customer_email || "").toLowerCase().includes(s) ||
        (c.customer_address || "").toLowerCase().includes(s)
      );
    });
  }, [calls, q]);

  // Performance Optimization: Memoize stats calculations
  const stats = useMemo(() => {
    let totalSec = 0;
    let completed = 0;
    let missed = 0;

    calls.forEach((c) => {
      totalSec += c.duration_seconds || 0;
      if (c.status === "completed") completed++;
      if (c.status === "missed") missed++;
    });

    return {
      totalMin: totalSec / 60,
      completed,
      missed,
    };
  }, [calls]);

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader
        eyebrow="History"
        title="Call History"
        description="Every call handled by your AI voice agents — with full customer details captured."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Calls" value={calls.length} />
        <StatCard label="Completed" value={stats.completed} accent="green" />
        <StatCard label="Missed" value={stats.missed} accent="red" />
        <StatCard label="Minutes" value={stats.totalMin.toFixed(1)} accent="blue" />
      </div>

      <SectionCard
        title={`${filtered.length} calls`}
        action={
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, phone, email, address…"
            className="w-72 h-9"
            data-testid="call-search-input"
          />
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px] tracking-widest uppercase">Started</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Customer</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Contact</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Address</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Agent</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Status</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase text-right">Duration</TableHead>
                <TableHead className="text-[10px] tracking-widest uppercase">Recording</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} data-testid={`call-row-${c.id}`}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {c.started_at ? new Date(c.started_at).toLocaleString() : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{c.customer_name || "—"}</div>
                    {c.customer_email && (
                      <div className="text-xs text-slate-500">{c.customer_email}</div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{c.caller_number || "—"}</TableCell>
                  <TableCell className="text-xs text-slate-700 max-w-[200px] truncate">
                    {c.customer_address || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{agents[c.agent_id]?.name || "—"}</TableCell>
                  <TableCell><StatusBadge status={c.status} /></TableCell>
                  <TableCell className="text-right font-mono">
                    {/* Fixed potential undefined error here with default value */}
                    {((c.duration_seconds || 0) / 60).toFixed(2)}m
                  </TableCell>
                  <TableCell>
                    {c.recording_url ? (
                      <audio controls src={c.recording_url} className="h-8 max-w-[180px]" />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500 py-12">
                    No calls yet. Configure your Vapi webhook to{" "}
                    <code className="font-mono">/api/vapi/webhook</code>.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}