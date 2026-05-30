"use client";

import { useState } from "react";
import { ClipboardPlus, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import SectionHeader from "@/components/section-header";

const STORAGE_KEY = "bdi_submissions_v1";

const CATEGORIES = [
  "งานซ่อมแซม","ซ่อมแซมไฟฟ้าชำรุด","ซ่อมแซมไฟจราจร",
  "วางท่อระบายน้ำ","ดูด/ลอก ท่อระบายน้ำ","ฝาท่อระบายน้ำ",
  "งานซ่อมแซมและบำรุงรักษาถนนและสะพาน","ตัดกิ่งไม้",
  "ติดตั้งโคมไฟฟ้า","เปลี่ยนหลอดไฟ","ทาสีตีเส้นจราจร/ยางชะลอความเร็ว",
  "กระจกนูน","ป้ายซอย","งานอาคารใหม่ 1","ฝ่ายจัดสภาพแวดล้อมด้านวัสดุที่ใช้แล้ว",
];

const DISTRICTS = ["เขต 1","เขต 2","เขต 3","เขต 4","เขต 7","ไม่ระบุเขต"];

const DEPARTMENTS = [
  "ฝ่ายสาธารณูปโภค","ฝ่ายจัดการคุณภาพน้ำ","ฝ่ายวิศวกรรมจราจร",
  "ฝ่ายแบบแผนและก่อสร้าง","ฝ่ายงานควบคุมอาคารและผังเมือง",
  "ฝ่ายสวนสาธารณะ","ฝ่ายศูนย์เครื่องจักรกล",
  "ฝ่ายจัดสภาพแวดล้อมด้านวัสดุที่ใช้แล้ว",
];

interface Submission {
  cid: string;
  text: string;
  category: string;
  district: string;
  community: string;
  department: string;
  received: string;
  status: string;
  submittedAt: string;
}

function genCid(): string {
  const now = new Date();
  const yy = String(now.getFullYear() + 543).slice(-2);
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `${seq}/${yy}`;
}

function loadSubmissions(): Submission[] {
  if (globalThis.window === undefined) return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Submission[]; }
  catch { return []; }
}

function saveSubmission(s: Submission) {
  const prev = loadSubmissions();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([s, ...prev]));
}

const EMPTY = { text: "", category: "", district: "", community: "", department: "" };

export default function SubmitPage() {
  const [form, setForm]       = useState(EMPTY);
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [errors, setErrors]   = useState<Partial<typeof EMPTY>>({});

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const e: Partial<typeof EMPTY> = {};
    if (!form.text.trim())       e.text       = "กรุณากรอกเรื่องร้องทุกข์";
    if (!form.category.trim())   e.category   = "กรุณาเลือกประเภท";
    if (!form.district)          e.district   = "กรุณาเลือกเขต";
    if (!form.department)        e.department = "กรุณาเลือกฝ่าย";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    const s: Submission = {
      cid:         genCid(),
      text:        form.text.trim(),
      category:    form.category.trim(),
      district:    form.district,
      community:   form.community.trim(),
      department:  form.department,
      received:    new Date().toISOString().split("T")[0],
      status:      "รอดำเนินการ",
      submittedAt: new Date().toISOString(),
    };
    saveSubmission(s);
    setSubmitted(s);
  }

  function reset() {
    setForm(EMPTY);
    setErrors({});
    setSubmitted(null);
  }

  if (submitted) {
    return (
      <div>
        <SectionHeader icon={<ClipboardPlus size={20} />} title="ยื่นคำร้อง" badge="สำเร็จ" />
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-500" />
          </div>
          <h2 className="text-[18px] font-700 text-[#0D1117] mb-1">รับเรื่องเรียบร้อย</h2>
          <p className="text-[13px] text-[#94A3B8] mb-5">เลขคำร้อง <span className="font-600 text-[#0057FF]">{submitted.cid}</span></p>
          <div className="text-left bg-[#F8FAFC] rounded-xl p-4 text-[13px] space-y-2 mb-6">
            {[
              ["เรื่องร้องทุกข์", submitted.text],
              ["ประเภท",          submitted.category],
              ["เขต",             submitted.district],
              ["ชุมชน",           submitted.community || "—"],
              ["ฝ่ายที่รับผิดชอบ", submitted.department],
              ["วันที่รับเรื่อง",  submitted.received],
              ["สถานะ",           submitted.status],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-[#94A3B8] w-32 shrink-0">{k}</span>
                <span className="text-[#334155] font-medium">{v}</span>
              </div>
            ))}
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 mx-auto text-[13px] text-[#0057FF] hover:underline"
          >
            <RotateCcw size={14} /> ยื่นคำร้องใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader icon={<ClipboardPlus size={20} />} title="ยื่นคำร้องใหม่" badge="แบบฟอร์ม" />

      {/* Prototype warning */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-[13px] text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-500 mt-0.5" />
        <span><strong>Prototype เท่านั้น</strong> — ข้อมูลถูกเก็บไว้ใน browser นี้เท่านั้น ไม่ได้ส่งไปยังระบบจริงและจะหายเมื่อล้างข้อมูล browser</span>
      </div>

      <div className="max-w-xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] p-6 space-y-5">

          {/* เรื่องร้องทุกข์ */}
          <div>
            <label className="block text-[13px] font-600 text-[#334155] mb-1.5">
              เรื่องร้องทุกข์ <span className="text-[#E5484D]">*</span>
            </label>
            <textarea
              value={form.text}
              onChange={(e) => set("text", e.target.value)}
              rows={3}
              placeholder="อธิบายปัญหาที่พบ..."
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-[#0D1117] resize-none outline-none focus:ring-2 focus:ring-[#0057FF]/20 focus:border-[#0057FF] transition-colors ${errors.text ? "border-[#E5484D]" : "border-[#E2E8F0]"}`}
            />
            {errors.text && <p className="text-[11px] text-[#E5484D] mt-1">{errors.text}</p>}
          </div>

          {/* ประเภทคำร้อง */}
          <div>
            <label className="block text-[13px] font-600 text-[#334155] mb-1.5">
              ประเภทคำร้อง <span className="text-[#E5484D]">*</span>
            </label>
            <input
              list="cat-list"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="เลือกหรือพิมพ์ประเภท..."
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-[#0D1117] outline-none focus:ring-2 focus:ring-[#0057FF]/20 focus:border-[#0057FF] transition-colors ${errors.category ? "border-[#E5484D]" : "border-[#E2E8F0]"}`}
            />
            <datalist id="cat-list">
              {CATEGORIES.map((c) => <option key={c} value={c} />)}
            </datalist>
            {errors.category && <p className="text-[11px] text-[#E5484D] mt-1">{errors.category}</p>}
          </div>

          {/* เขต + ชุมชน */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-600 text-[#334155] mb-1.5">
                เขต <span className="text-[#E5484D]">*</span>
              </label>
              <select
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-[#0D1117] outline-none focus:ring-2 focus:ring-[#0057FF]/20 focus:border-[#0057FF] transition-colors bg-white ${errors.district ? "border-[#E5484D]" : "border-[#E2E8F0]"}`}
              >
                <option value="">— เลือกเขต —</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.district && <p className="text-[11px] text-[#E5484D] mt-1">{errors.district}</p>}
            </div>
            <div>
              <label className="block text-[13px] font-600 text-[#334155] mb-1.5">ชุมชน</label>
              <input
                value={form.community}
                onChange={(e) => set("community", e.target.value)}
                placeholder="ชื่อชุมชน (ถ้ามี)"
                className="w-full rounded-xl border border-[#E2E8F0] px-3.5 py-2.5 text-[13px] text-[#0D1117] outline-none focus:ring-2 focus:ring-[#0057FF]/20 focus:border-[#0057FF] transition-colors"
              />
            </div>
          </div>

          {/* ฝ่าย */}
          <div>
            <label className="block text-[13px] font-600 text-[#334155] mb-1.5">
              ฝ่ายที่รับผิดชอบ <span className="text-[#E5484D]">*</span>
            </label>
            <select
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-[13px] text-[#0D1117] outline-none focus:ring-2 focus:ring-[#0057FF]/20 focus:border-[#0057FF] transition-colors bg-white ${errors.department ? "border-[#E5484D]" : "border-[#E2E8F0]"}`}
            >
              <option value="">— เลือกฝ่าย —</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {errors.department && <p className="text-[11px] text-[#E5484D] mt-1">{errors.department}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-[#0057FF] text-white rounded-xl py-3 text-[14px] font-600 hover:bg-[#0046CC] transition-colors"
          >
            ยื่นคำร้อง
          </button>
        </form>
      </div>
    </div>
  );
}
