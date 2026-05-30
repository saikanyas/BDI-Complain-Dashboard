"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface HBarProps {
  data: { name: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
}

const TOOLTIP_STYLE = {
  borderRadius: 10, border: "1px solid #E2E8F0",
  fontSize: 13, boxShadow: "0 4px 16px rgba(0,0,0,.08)",
};

export default function HBar({ data, color = "#0057FF", height = 320, unit = "" }: HBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 32, top: 4, bottom: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category" dataKey="name" width={140}
          tick={{ fontSize: 12, fill: "#334155" }} tickLine={false} axisLine={false}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(v) => [`${Number(v).toLocaleString()}${unit}`, "จำนวน"]}
          cursor={{ fill: "#F0F4F8" }}
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={24}>
          {data.map((_, i) => (
            <Cell key={i} fill={color} opacity={0.7 + (i / data.length) * 0.3} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
