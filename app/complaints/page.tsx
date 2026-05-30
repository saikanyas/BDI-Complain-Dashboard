import { BarChart2 } from "lucide-react";
import SectionHeader from "@/components/section-header";
import ChartCard from "@/components/chart-card";
import VBar from "@/components/charts/v-bar";
import HBar from "@/components/charts/h-bar";

import categories from "@/public/data/categories.json";
import departments from "@/public/data/departments.json";
import districts from "@/public/data/districts.json";
import recurring from "@/public/data/recurring.json";

export default function ComplaintsPage() {
  const distCount = districts
    .map((d) => ({ name: d.name, value: d.total }))
    .sort((a, b) => a.value - b.value);

  return (
    <div>
      <SectionHeader icon={<BarChart2 size={20} />} title="การวิเคราะห์ประเภทคำร้อง" badge={`${categories.reduce((s, c) => s + c.value, 0).toLocaleString()} รายการ`} />

      <ChartCard title="Top 15 ประเภทคำร้อง" sub="ประเภทที่ประชาชนร้องเรียนมากที่สุด">
        <HBar data={categories} color="#0057FF" height={480} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="คำร้องตามฝ่าย" sub="จำนวนคำร้องที่แต่ละฝ่ายรับผิดชอบ">
          <HBar data={departments} color="#7B2FFF" height={360} />
        </ChartCard>
        <ChartCard title="คำร้องตามเขต" sub="การกระจายตามพื้นที่">
          <VBar data={distCount} color="#00C2CB" height={360} />
        </ChartCard>
      </div>

      <div className="mt-4">
        <ChartCard title="Complaint ที่ Recurring สูงสุด" sub="หมวดคำร้องที่ซ้ำมากที่สุดในแต่ละเขต (Top 15)">
          <HBar data={recurring} color="#E8960C" height={460} />
        </ChartCard>
      </div>
    </div>
  );
}
