import { ClipboardList, CheckCircle, Clock, Timer, Trophy, Gauge } from "lucide-react";
import KpiCard from "@/components/kpi-card";
import ChartCard from "@/components/chart-card";
import TrendLine from "@/components/charts/trend-line";
import HBar from "@/components/charts/h-bar";
import Donut from "@/components/charts/donut";

import summary from "@/public/data/summary.json";
import trend from "@/public/data/trend.json";
import status from "@/public/data/status.json";
import priority from "@/public/data/priority.json";
import sentiment from "@/public/data/sentiment.json";
import districts from "@/public/data/districts.json";

const PRIORITY_COLORS: Record<string, string> = {
  "🔴 สูง": "#E5484D", "🟡 กลาง": "#E8960C", "🟢 ต่ำ": "#00B37E",
};

export default function OverviewPage() {
  const distRate = districts
    .map((d) => ({ name: d.name, value: d.rate }))
    .sort((a, b) => a.value - b.value);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[26px] font-bold text-[#0D1117] tracking-tight">
          ภาพรวมระบบคำร้องเรียน
        </h1>
        <p className="text-[14px] text-[#334155] mt-1">
          เทศบาลนครขอนแก่น &nbsp;·&nbsp; Smart City Complaint Intelligence Platform
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard icon={<ClipboardList size={20} />} label="คำร้องทั้งหมด"    value={summary.total.toLocaleString()}   color="#0057FF" />
        <KpiCard icon={<CheckCircle size={20} />}  label="ดำเนินการเสร็จ"    value={summary.done.toLocaleString()}    color="#00B37E" />
        <KpiCard icon={<Clock size={20} />}        label="รอดำเนินการ"       value={summary.pending.toLocaleString()} color="#E8960C" />
        <KpiCard icon={<Timer size={20} />}        label="เฉลี่ย SLA (วัน)" value={summary.avg_sla}                  color="#00C2CB" />
        <KpiCard icon={<Trophy size={20} />}       label="ประเภทที่พบมากสุด" value={summary.top_category.slice(0, 12)} color="#7B2FFF" />
        <KpiCard icon={<Gauge size={20} />}        label="Completion Rate"   value={`${summary.completion_rate}%`}
          color={summary.completion_rate >= 90 ? "#00B37E" : "#E8960C"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div className="lg:col-span-3">
          <ChartCard title="แนวโน้มคำร้องรายเดือน" sub="จำนวนคำร้องที่เข้ามาแต่ละเดือน">
            <TrendLine data={trend} height={260} />
          </ChartCard>
        </div>
        <div className="lg:col-span-2">
          <ChartCard title="สถานะคำร้อง" sub="การกระจายตามสถานะปัจจุบัน">
            <HBar data={status} color="#0057FF" height={260} />
          </ChartCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ChartCard title="ระดับความสำคัญ" sub="จัดลำดับจากคำร้องเร่งด่วน">
          <Donut
            data={priority}
            colors={priority.map((p) => PRIORITY_COLORS[p.name] ?? "#94A3B8")}
            height={240}
          />
        </ChartCard>
        <ChartCard title="Sentiment" sub="อารมณ์จากเนื้อหาคำร้อง">
          <Donut data={sentiment} colors={["#E5484D", "#E8960C", "#00B37E"]} height={240} />
        </ChartCard>
        <ChartCard title="Completion Rate ตามเขต" sub="อัตราดำเนินการเสร็จแต่ละพื้นที่">
          <HBar data={distRate} color="#00B37E" height={240} unit="%" />
        </ChartCard>
      </div>
    </div>
  );
}
