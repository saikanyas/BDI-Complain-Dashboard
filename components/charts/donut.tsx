"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DonutProps {
  data: { name: string; value: number }[];
  colors?: string[];
  height?: number;
}

const DEFAULT_COLORS = ["#0057FF", "#00C2CB", "#7B2FFF", "#00B37E", "#E8960C", "#E5484D"];

export default function Donut({ data, colors = DEFAULT_COLORS, height = 260 }: DonutProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data} cx="50%" cy="45%"
          innerRadius="55%" outerRadius="78%"
          dataKey="value" paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 13 }}
          formatter={(v) => [Number(v).toLocaleString(), "จำนวน"]}
        />
        <Legend
          iconType="circle" iconSize={8}
          formatter={(v) => <span style={{ fontSize: 12, color: "#334155" }}>{v}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
