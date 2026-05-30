import { Timer, BarChart2, AlertOctagon, CheckCircle } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import SectionHeader from "@/components/section-header";
import ChartCard from "@/components/chart-card";
import HBar from "@/components/charts/h-bar";
import VBar from "@/components/charts/v-bar";

import summary from "@/public/data/summary.json";
import sla from "@/public/data/sla.json";
import daysDist from "@/public/data/days_dist.json";
import slaCategory from "@/public/data/sla_category.json";

function SlaTag({ mean }: Readonly<{ mean: number }>) {
  if (mean <= 7)  return <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">ดีเยี่ยม</span>;
  if (mean <= 14) return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">พอใช้</span>;
  return <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">ล่าช้า</span>;
}

export default function PerformancePage() {
  const slaBar = sla
    .map((d) => ({ name: d.name, value: Number.parseFloat(d.mean.toFixed(1)) }))
    .sort((a, b) => a.value - b.value);

  return (
    <div>
      <SectionHeader icon={<Timer size={20} />} title="ประสิทธิภาพและระยะเวลาดำเนินการ" badge={`${summary.done.toLocaleString()} รายการที่เสร็จแล้ว`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          icon={<Timer size={20} />}
          label="เฉลี่ยวันดำเนินการ"
          value={summary.avg_sla}
          color="#0057FF"
          description="จำนวนวันเฉลี่ยในการดำเนินการคำร้องจนเสร็จสิ้น คำนวณจากทุกคำร้องที่ดำเนินการเสร็จแล้ว"
        />
        <KpiCard
          icon={<BarChart2 size={20} />}
          label="มัธยฐานวันดำเนินการ"
          value={summary.median_sla}
          color="#00C2CB"
          description="ค่ากลางของวันดำเนินการ ไม่ได้รับผลกระทบจากคำร้องที่ใช้เวลานานผิดปกติ สะท้อนประสบการณ์ของประชาชนส่วนใหญ่"
        />
        <KpiCard
          icon={<AlertOctagon size={20} />}
          label="นานสุด (วัน)"
          value={summary.max_sla}
          color="#E5484D"
          description="คำร้องที่ใช้เวลาดำเนินการนานที่สุดในระบบ ค่าสูงอาจบ่งชี้ปัญหาเฉพาะบางกรณี"
        />
        <KpiCard
          icon={<CheckCircle size={20} />}
          label="อัตราเสร็จสิ้น"
          value={`${summary.completion_rate}%`}
          color={summary.completion_rate >= 90 ? "#00B37E" : "#E8960C"}
          description="สัดส่วนคำร้องที่ดำเนินการเสร็จสิ้นแล้วต่อคำร้องทั้งหมด เป้าหมายคือ 90% ขึ้นไป"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="วันดำเนินการเฉลี่ยตามฝ่าย" sub="น้อยกว่า 7 วัน · น้อยกว่า 14 วัน · เกิน 14 วัน">
          <HBar data={slaBar} color="#0057FF" height={400} unit=" วัน" />
        </ChartCard>
        <ChartCard title="การกระจายวันดำเนินการ" sub="ความถี่ของจำนวนวันที่ใช้ดำเนินการ">
          <VBar data={daysDist.map((d) => ({ name: d.range, value: d.count }))} color="#7B2FFF" height={400} />
        </ChartCard>
      </div>

      <ChartCard title="หมวดไหนปิดงานช้าที่สุด" sub="มัธยฐานวันดำเนินการจนเสร็จสิ้น (เฉพาะหมวดที่มี ≥3 รายการ)">
        <HBar
          data={slaCategory.map((d) => ({ name: d.name, value: d.median })).reverse()}
          color="#E5484D"
          height={420}
          unit=" วัน"
        />
      </ChartCard>

      <ChartCard title="ตาราง SLA สรุปรายฝ่าย" sub="">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E2E8F0]">
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">ฝ่าย</th>
                <th className="hidden sm:table-cell text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">คำร้อง</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">เฉลี่ย (วัน)</th>
                <th className="hidden sm:table-cell text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">มัธยฐาน</th>
                <th className="hidden lg:table-cell text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">ต่ำสุด</th>
                <th className="hidden lg:table-cell text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">สูงสุด</th>
                <th className="text-left py-2.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">สถานะ SLA</th>
              </tr>
            </thead>
            <tbody>
              {[...sla].sort((a, b) => a.mean - b.mean).map((row) => (
                <tr key={row.name} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="py-2.5 px-3 font-medium text-[#0D1117]">{row.name}</td>
                  <td className="hidden sm:table-cell py-2.5 px-3 text-[#334155]">{row.count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-[#334155]">{row.mean.toFixed(1)}</td>
                  <td className="hidden sm:table-cell py-2.5 px-3 text-[#334155]">{row.median.toFixed(1)}</td>
                  <td className="hidden lg:table-cell py-2.5 px-3 text-[#334155]">{row.min}</td>
                  <td className="hidden lg:table-cell py-2.5 px-3 text-[#334155]">{row.max}</td>
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
