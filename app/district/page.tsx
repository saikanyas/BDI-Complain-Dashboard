import { Map } from "lucide-react";
import SectionHeader from "@/components/section-header";
import ChartCard from "@/components/chart-card";
import VBar from "@/components/charts/h-bar";

import districts from "@/public/data/districts.json";
import communities from "@/public/data/communities.json";

function rateColor(rate: number) {
  if (rate >= 80) return "#00B37E";
  if (rate >= 60) return "#E8960C";
  return "#E5484D";
}

export default function DistrictPage() {
  const byCount = [...districts]
    .map((d) => ({ name: d.name, value: d.total }))
    .sort((a, b) => a.value - b.value);

  const byRate = [...districts]
    .map((d) => ({ name: d.name, value: d.rate }))
    .sort((a, b) => a.value - b.value);

  return (
    <div>
      <SectionHeader icon={<Map size={20} />} title="District & Community Analysis" badge="Geospatial" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="จำนวนคำร้องตามเขต" sub="">
          <VBar data={byCount} color="#0057FF" height={320} />
        </ChartCard>
        <ChartCard title="Completion Rate ตามเขต (%)" sub="อัตราดำเนินการเสร็จแต่ละพื้นที่">
          <VBar data={byRate} color="#00B37E" height={320} unit="%" />
        </ChartCard>
      </div>

      <ChartCard title="Top 15 ชุมชนที่มีคำร้องมากที่สุด" sub="">
        <VBar data={communities} color="#7B2FFF" height={440} />
      </ChartCard>

      {/* District summary table */}
      <ChartCard title="สรุปข้อมูลรายเขต" sub="" >
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                {["เขต", "คำร้องทั้งหมด", "เสร็จแล้ว", "รอดำเนินการ", "Completion Rate"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...districts].sort((a, b) => b.total - a.total).map((row) => (
                <tr key={row.name} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-3 font-medium text-[#0D1117]">{row.name}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.total.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.done.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{(row.total - row.done).toLocaleString()}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#F1F5F9] rounded-full h-1.5 max-w-[80px]">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${row.rate}%`, background: rateColor(row.rate) }}
                        />
                      </div>
                      <span className="text-[#334155]">{row.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
