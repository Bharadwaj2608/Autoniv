import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, StatCard, SectionCard } from "@/components/Layout/PageBits";
import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell, PieChart, Pie,
} from "recharts";

export default function UserAnalytics() {
  const [data, setData] = useState({ summary: { total_calls: 0, total_minutes: 0, completed: 0, missed: 0 }, daily: [] });
  useEffect(() => { api.get("/analytics").then((r) => setData(r.data)); }, []);

  const pieData = [
    { name: "Completed", value: data.summary.completed, fill: "#10B981" },
    { name: "Missed", value: data.summary.missed, fill: "#F59E0B" },
    { name: "Other", value: Math.max(0, data.summary.total_calls - data.summary.completed - data.summary.missed), fill: "#94A3B8" },
  ];

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl">
      <PageHeader eyebrow="Insights" title="Analytics" description="Performance of your voice agents over time." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Calls" value={data.summary.total_calls} />
        <StatCard label="Completed" value={data.summary.completed} accent="green" />
        <StatCard label="Missed" value={data.summary.missed} accent="red" />
        <StatCard label="Minutes Used" value={data.summary.total_minutes.toFixed(1)} accent="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SectionCard title="Calls & minutes (last 14 days)" >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="calls" fill="#0A0A0A" name="Calls" />
                <Bar dataKey="minutes" fill="#2563EB" name="Minutes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {data.daily.length === 0 && <p className="text-center text-sm text-slate-500 -mt-40">No data yet.</p>}
        </SectionCard>

        <SectionCard title="Call outcomes">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                  {pieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
