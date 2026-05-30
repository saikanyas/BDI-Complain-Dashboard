import { Timer, BarChart2, AlertOctagon, CheckCircle } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import SectionHeader from "@/components/section-header";
import ChartCard from "@/components/chart-card";
import VBar from "@/components/charts/h-bar";

import summary from "@/public/data/summary.json";
import sla from "@/public/data/sla.json";
import daysDist from "@/public/data/days_dist.json";

function SlaTag({ mean }: { mean: number }) {
  if (mean <= 7)  return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ดีเยี่ยม</span>;
  if (mean <= 14) return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">พอใช้</span>;
  return <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">ล่าช้า</span>;
}

export default function PerformancePage() {
  const slaBar = sla
    .map((d) => ({ name: d.name, value: parseFloat(d.mean.toFixed(1)) }))
    .sort((a, b) => a.value - b.value);

  return (
    <div>
      <SectionHeader icon={<Timer size={20} />} title="Performance Analytics & SLA" badge={`${summary.done.toLocaleString()} รายการที่เสร็จแล้ว`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={<Timer size={20} />}        label="เฉลี่ยวันดำเนินการ" value={summary.avg_sla}    color="#0057FF" />
        <KpiCard icon={<BarChart2 size={20} />}    label="Median (วัน)"       value={summary.median_sla} color="#00C2CB" />
        <KpiCard icon={<AlertOctagon size={20} />} label="สูงสุด (วัน)"      value={summary.max_sla}    color="#E5484D" />
        <KpiCard icon={<CheckCircle size={20} />}  label="Completion Rate"    value={`${summary.completion_rate}%`}
          color={summary.completion_rate >= 90 ? "#00B37E" : "#E8960C"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Average SLA ตามฝ่าย" sub="ต่ำกว่า 7 วัน · ต่ำกว่า 14 วัน · เกิน 14 วัน">
          <VBar data={slaBar} color="#0057FF" height={400} unit=" วัน" />
        </ChartCard>
        <ChartCard title="การกระจายวันดำเนินการ" sub="Histogram แสดงความถี่ของจำนวนวัน">
          <VBar data={daysDist.map((d) => ({ name: d.range, value: d.count }))} color="#7B2FFF" height={400} />
        </ChartCard>
      </div>

      {/* SLA Table */}
      <ChartCard title="ตาราง SLA สรุปรายฝ่าย" sub="">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                {["ฝ่าย", "คำร้อง", "เฉลี่ย (วัน)", "Median", "Min", "Max", "สถานะ SLA"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...sla].sort((a, b) => a.mean - b.mean).map((row) => (
                <tr key={row.name} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-3 font-medium text-[#0D1117]">{row.name}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.mean.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.median.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-[#334155]">—</td>
                  <td className="py-2.5 px-3 text-[#334155]">—</td>
                  <td className="py-2.5 px-3"><SlaTag mean={row.mean} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
