"use client";

import { useEffect, useState } from "react";
import { BrainCircuit, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import SectionHeader from "@/components/section-header";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PredictRow {
  cid: string;
  text: string;
  district: string;
  community: string;
  received: string | null;
  category: string;
  department: string;
  predicted_days: number;
  expected_done: string | null;
  overdue: boolean;
}

function StatusBadge({ overdue, expected }: { overdue: boolean; expected: string | null }) {
  if (!expected) return <span className="text-[#94A3B8] text-xs">ไม่ระบุ</span>;
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#E5484D] bg-[#FEF2F2] px-2 py-0.5 rounded-full">
        <AlertTriangle size={11} /> เกินกำหนด
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#00B37E] bg-[#F0FDF9] px-2 py-0.5 rounded-full">
      <Clock size={11} /> กำลังดำเนินการ
    </span>
  );
}

export default function PredictPage() {
  const [rows, setRows]     = useState<PredictRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/pending-predictions`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => { setRows(data); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const overdueCount = rows.filter((r) => r.overdue).length;
  const onTimeCount  = rows.filter((r) => !r.overdue && r.expected_done).length;

  return (
    <div>
      <SectionHeader
        icon={<BrainCircuit size={20} />}
        title="AI Prediction — คำร้องที่รอดำเนินการ"
        badge={`${rows.length} รายการ`}
      />

      {/* Summary KPIs */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "คำร้องรอดำเนินการ", value: rows.length,    color: "#0057FF", icon: <BrainCircuit size={16} /> },
            { label: "เกินกำหนด",          value: overdueCount,  color: "#E5484D", icon: <AlertTriangle size={16} /> },
            { label: "กำลังดำเนินการ",     value: onTimeCount,   color: "#00B37E", icon: <CheckCircle2 size={16} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-[#E2E8F0] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}18`, color }}>
                {icon}
              </div>
              <div>
                <p className="text-[22px] font-700 text-[#0D1117] leading-none">{value}</p>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-48 text-[#94A3B8] text-sm">
            กำลังโหลดข้อมูล...
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-[#E5484D] font-medium">เชื่อมต่อ API ไม่ได้</p>
            <p className="text-[#94A3B8] text-xs">ตรวจสอบว่า API รันอยู่ที่ {API}</p>
          </div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  {["เลขคำร้อง", "ข้อความ", "เขต", "วันที่รับ", "ประเภท", "หน่วยงาน", "คาดเสร็จใน", "วันที่คาดเสร็จ", "สถานะ"].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.cid} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                    <td className="px-3 py-2.5 font-medium text-[#0057FF] whitespace-nowrap">{row.cid || "—"}</td>
                    <td className="px-3 py-2.5 text-[#334155] max-w-[220px] truncate" title={row.text}>{row.text}</td>
                    <td className="px-3 py-2.5 text-[#334155] whitespace-nowrap">{row.district || "—"}</td>
                    <td className="px-3 py-2.5 text-[#94A3B8] whitespace-nowrap">{row.received ?? "—"}</td>
                    <td className="px-3 py-2.5 text-[#334155] whitespace-nowrap">{row.category}</td>
                    <td className="px-3 py-2.5 text-[#334155] whitespace-nowrap">{row.department}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="font-semibold text-[#334155]">{row.predicted_days}</span>
                      <span className="text-[#94A3B8] ml-0.5">วัน</span>
                    </td>
                    <td className="px-3 py-2.5 text-[#334155] whitespace-nowrap">{row.expected_done ?? "—"}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge overdue={row.overdue} expected={row.expected_done} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
