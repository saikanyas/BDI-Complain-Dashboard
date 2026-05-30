"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from "recharts";

interface VBarProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

const TOOLTIP_STYLE = {
  borderRadius: 10, border: "1px solid #E2E8F0",
  fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.08)",
};

const trim = (s: string, n = 12) => s.length > n ? s.slice(0, n) + "…" : s;

export default function VBar({ data, color = "#0057FF", height = 320, unit = "" }: VBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 72 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={true} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#334155", angle: -40, textAnchor: "end" }}
          tickLine={false}
          axisLine={false}
          interval={0}
          tickFormatter={(v) => trim(v)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94A3B8" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`${Number(v).toLocaleString()}${unit}`, "จำนวน"]}
          cursor={{ fill: "#F0F4F8" }}
          labelFormatter={(label) => data.find(d => trim(d.name) === label || d.name === label)?.name ?? label}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} opacity={0.7 + (i / data.length) * 0.3} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
