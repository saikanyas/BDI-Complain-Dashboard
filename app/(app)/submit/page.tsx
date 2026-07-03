"use client";

import { useState } from "react";
import { ClipboardPlus, AlertTriangle, CheckCircle2, RotateCcw, Loader2, Camera, X, Sparkles, Bot } from "lucide-react";
import SectionHeader from "@/components/section-header";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const CATEGORIES = [
  "งานซ่อมแซม","ซ่อมแซมไฟฟ้าชำรุด","ซ่อมแซมไฟจราจร",
  "วางท่อระบายน้ำ","ดูด/ลอก ท่อระบายน้ำ","ฝาท่อระบายน้ำ",
  "งานซ่อมแซมและบำรุงรักษาถนนและสะพาน","ตัดกิ่งไม้",
  "ติดตั้งโคมไฟฟ้า","เปลี่ยนหลอดไฟ","ทาสีตีเส้นจราจร/ยางชะลอความเร็ว",
  "กระจกนูน","ป้ายซอย","งานอาคารใหม่ 1","ฝ่ายจัดสภาพแวดล้อมด้านวัสดุที่ใช้แล้ว",
];

const DISTRICTS = ["เขต 1","เขต 2","เขต 3","เขต 4","เขต 7","ไม่ระบุเขต"];

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
  photoUrl?: string | null;
  aiMode?: string | null;
  ackMessage?: string | null;
  duplicateWarning?: string | null;
}

const EMPTY = { text: "", category: "", district: "", community: "", lineToken: "" };

export default function SubmitPage() {
  const [form, setForm]       = useState(EMPTY);
  const [photo, setPhoto]     = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [errors, setErrors]   = useState<Partial<typeof EMPTY>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState<string | null>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setApiError("ไฟล์รูปต้องไม่เกิน 8MB");
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  function removePhoto() {
    setPhoto(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  function set(field: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const e: Partial<typeof EMPTY> = {};
    if (!form.text.trim())       e.text       = "กรุณากรอกเรื่องร้องทุกข์";
    if (!form.category.trim())   e.category   = "กรุณาเลือกประเภท";
    if (!form.district)          e.district   = "กรุณาเลือกเขต";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setApiError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append("text", form.text.trim());
      fd.append("category", form.category.trim());
      fd.append("district", form.district);
      fd.append("community", form.community.trim());
      if (form.lineToken.trim()) fd.append("line_token", form.lineToken.trim());
      if (photo) fd.append("photo", photo);

      const res = await fetch(`${API}/complaints`, { method: "POST", body: fd });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `ส่งคำร้องไม่สำเร็จ (HTTP ${res.status})`);
      }

      const data: {
        cid: string; status: string; photo_url?: string | null;
        category?: string; department?: string; priority?: string;
        ai_mode?: string; ack_message?: string; duplicate_warning?: string | null;
      } = await res.json();

      setSubmitted({
        cid:         data.cid,
        text:        form.text.trim(),
        category:    data.category ?? form.category.trim(),
        district:    form.district,
        community:   form.community.trim(),
        department:  data.department ?? "รอเจ้าหน้าที่ยืนยัน",
        received:    new Date().toISOString().split("T")[0],
        status:      data.status,
        submittedAt: new Date().toISOString(),
        photoUrl:    data.photo_url ?? null,
        aiMode:      data.ai_mode ?? null,
        ackMessage:  data.ack_message ?? null,
        duplicateWarning: data.duplicate_warning ?? null,
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setForm(EMPTY);
    setErrors({});
    setSubmitted(null);
    setApiError(null);
    removePhoto();
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

          {submitted.ackMessage && (
            <div className="text-left bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 text-[13px] text-blue-800 flex items-start gap-2.5">
              <Sparkles size={15} className="shrink-0 mt-0.5" />
              <div>
                {submitted.ackMessage}
                {submitted.aiMode === "ai" && (
                  <div className="text-[11px] text-blue-500 mt-1.5 flex items-center gap-1">
                    <Sparkles size={10} /> วิเคราะห์โดย AI
                  </div>
                )}
              </div>
            </div>
          )}

          {submitted.duplicateWarning && (
            <div className="text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-[13px] text-amber-800 flex items-start gap-2.5">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {submitted.duplicateWarning}
            </div>
          )}

          {submitted.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`${API}${submitted.photoUrl}`} alt="รูปที่แนบ" className="rounded-xl max-h-56 mx-auto mb-5 object-cover border border-[#E2E8F0]" />
          )}
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

      {/* AI routing notice */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-5 text-[13px] text-blue-800">
        <Bot size={15} className="shrink-0 text-blue-500 mt-0.5" />
        <span><strong>AI จะวิเคราะห์และมอบหมายหน่วยงานให้อัตโนมัติ</strong> — ท่านไม่ต้องเลือกฝ่ายหรือหน่วยงานเอง เจ้าหน้าที่จะตรวจสอบและยืนยันอีกครั้งก่อนดำเนินการ</span>
      </div>

      {apiError && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-[13px] text-red-700">
          <AlertTriangle size={15} className="shrink-0 text-red-500 mt-0.5" />
          <span><strong>ส่งคำร้องไม่สำเร็จ</strong> — {apiError}</span>
        </div>
      )}

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

          {/* แนบรูปภาพ */}
          <div>
            <label className="block text-[13px] font-600 text-[#334155] mb-1.5">แนบรูปภาพ (ถ้ามี)</label>
            {preview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="ตัวอย่างรูป" className="rounded-xl max-h-40 border border-[#E2E8F0] object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#0D1117] text-white flex items-center justify-center hover:bg-red-500 transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#E2E8F0] rounded-xl py-6 cursor-pointer hover:border-[#0057FF]/40 hover:bg-[#F8FAFC] transition-colors text-[13px] text-[#94A3B8]">
                <Camera size={18} />
                คลิกเพื่อเลือกรูปภาพ (jpg, png, webp · สูงสุด 8MB)
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="hidden" />
              </label>
            )}
          </div>

          {/* LINE Notify (ไม่บังคับ) */}
          <div>
            <label className="block text-[13px] font-600 text-[#334155] mb-1.5">
              LINE Notify Token (ไม่บังคับ)
            </label>
            <input
              type="text"
              value={form.lineToken}
              onChange={(e) => set("lineToken", e.target.value)}
              placeholder="วาง token ที่นี่ ถ้าอยากรับแจ้งเตือนตอนปิดงาน"
              className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
            />
            <p className="text-[11.5px] text-[#94A3B8] mt-1.5">
              ถ้าใส่ไว้ ระบบจะส่งแจ้งเตือนผ่าน LINE ให้อัตโนมัติทันทีที่เจ้าหน้าที่ปิดงานคำร้องนี้ —
              ขอ token ส่วนตัวได้ฟรีที่{" "}
              <a href="https://notify-bot.line.me/my/" target="_blank" rel="noreferrer" className="text-[#0057FF] hover:underline">
                notify-bot.line.me/my
              </a>
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-[#0057FF] text-white rounded-xl py-3 text-[14px] font-600 hover:bg-[#0046CC] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "กำลังส่ง..." : "ยื่นคำร้อง"}
          </button>
        </form>
      </div>
    </div>
  );
}
