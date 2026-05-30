"use client";

import { useState } from "react";
import TrendLine from "./trend-line";

const PERIODS = [
  { label: "3 เดือน",  days: 90  },
  { label: "5 เดือน",  days: 150 },
  { label: "12 เดือน", days: 365 },
  { label: "2 ปี",     days: 730 },
  { label: "3 ปี",     days: 1095 },
  { label: "ทั้งหมด",  days: 0   },
] as const;

type Period = (typeof PERIODS)[number];

function filterData(data: { month: string; count: number }[], days: number) {
  if (days === 0) return data;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return data.filter(({ month }) => {
    const [y, m] = month.split("-").map(Number);
    return new Date(y, m - 1, 1) >= cutoff;
  });
}

export default function TrendWithFilter({
  data,
  height = 240,
}: {
  readonly data: { month: string; count: number }[];
  readonly height?: number;
}) {
  const [active, setActive] = useState<Period>(PERIODS[4]);

  const filtered = filterData(data, active.days);

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {PERIODS.map((p) => (
          <button
            key={p.label}
            onClick={() => setActive(p)}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
              active.label === p.label
                ? "bg-[#0057FF] text-white border-[#0057FF]"
                : "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#0057FF] hover:text-[#0057FF]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <TrendLine data={filtered} height={height} />
    </div>
  );
}
