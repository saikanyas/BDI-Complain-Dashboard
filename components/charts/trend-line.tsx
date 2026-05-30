"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts";

interface TrendLineProps {
  data: { month: string; count: number }[];
  height?: number;
}

const avg = (data: { count: number }[]) =>
  data.length ? data.reduce((s, d) => s + d.count, 0) / data.length : 0;

export default function TrendLine({ data, height = 280 }: TrendLineProps) {
  const mean = avg(data);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false} axisLine={false}
        />
        <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }}
          formatter={(v) => [Number(v).toLocaleString(), "คำร้อง"]}
        />
        <ReferenceLine y={mean} stroke="#94A3B8" strokeDasharray="4 4" />
        <Line
          type="monotone" dataKey="count" stroke="#0057FF"
          strokeWidth={2.5} dot={{ r: 3, fill: "#0057FF" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
