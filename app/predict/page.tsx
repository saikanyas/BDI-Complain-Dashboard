"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";
import SectionHeader from "@/components/section-header";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STORAGE_KEY = "bdi_votes_v2";

interface PendingRow {
  cid: string;
  text: string;
  district: string;
  category: string;
  received: string | null;
  department: string;
  priority: string;
  predicted_days: number;
  expected_done: string | null;
}

const PRIORITY_STYLE: Record<string, string> = {
  "สูง":   "bg-red-50 text-red-600 border-red-200",
  "กลาง":  "bg-amber-50 text-amber-600 border-amber-200",
  "ต่ำ":   "bg-emerald-50 text-emerald-600 border-emerald-200",
};

type UserVotes = Record<string, 1 | -1 | 0>;

/* deterministic fake votes from complaint ID so they stay consistent */
function fakeVotes(id: string): { up: number; down: number } {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.trunc(Math.imul(31, h) + (id.codePointAt(i) ?? 0));
  }
  const abs = Math.abs(h);
  return { up: 10 + (abs % 70), down: 1 + ((abs >> 4) % 12) };
}

function netScore(cid: string, uv: UserVotes): number {
  const { up, down } = fakeVotes(cid);
  const u = uv[cid] ?? 0;
  return up + (u === 1 ? 1 : 0) - down - (u === -1 ? 1 : 0);
}

function loadVotes(): UserVotes {
  if (globalThis.window === undefined) return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as UserVotes; }
  catch { return {}; }
}

function scoreColor(s: number) {
  if (s > 0) return "text-[#E8960C]";
  if (s < 0) return "text-[#E5484D]";
  return "text-[#94A3B8]";
}

function saveVotes(v: UserVotes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
}

export default function PredictPage() {
  const [rows, setRows]       = useState<PendingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");

  useEffect(() => {
    setUserVotes(loadVotes());
    fetch(`${API}/pending-predictions`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: PendingRow[]) => { setRows(data); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  function vote(cid: string, dir: 1 | -1) {
    setUserVotes((prev) => {
      const cur = prev[cid] ?? 0;
      const next: UserVotes = { ...prev, [cid]: cur === dir ? 0 : dir };
      saveVotes(next);
      return next;
    });
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "date") {
      return (a.expected_done ?? "9999") < (b.expected_done ?? "9999") ? -1 : 1;
    }
    return netScore(b.cid, userVotes) - netScore(a.cid, userVotes);
  });

  return (
    <div>
      <SectionHeader
        icon={<ChevronUp size={20} />}
        title="ลงคะแนนคำร้องที่รอดำเนินการ"
        badge={loading ? "..." : `${rows.length} รายการ`}
      />

      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-[13px] text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-500" />
        <span>คำร้องมาจากข้อมูลจริง · <strong>คะแนนโหวตเริ่มต้นเป็นข้อมูลสาธิตเพื่อ prototype เท่านั้น</strong> · คะแนนที่คุณโหวตจะถูกบันทึกไว้ในเบราว์เซอร์</span>
      </div>

      {/* Sort toggle */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] text-[#94A3B8]">เรียงตาม:</span>
        {(["votes", "date"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setSortBy(opt)}
            className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
              sortBy === opt
                ? "bg-[#0057FF] text-white border-[#0057FF]"
                : "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#0057FF] hover:text-[#0057FF]"
            }`}
          >
            {opt === "votes" ? "คะแนนโหวต" : "วันที่คาดเสร็จ"}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center items-center h-48 text-[#94A3B8] text-sm">กำลังโหลดข้อมูล...</div>
      )}
      {error && (
        <div className="flex flex-col items-center justify-center h-48 gap-1">
          <p className="text-[#E5484D] font-medium">เชื่อมต่อ API ไม่ได้</p>
          <p className="text-[#94A3B8] text-xs">{API}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          {sorted.map((c) => {
            const uv  = userVotes[c.cid] ?? 0;
            const s   = netScore(c.cid, userVotes);
            return (
              <div key={c.cid} className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex gap-3 hover:shadow-md transition-shadow">

                {/* Vote column */}
                <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                  <button
                    onClick={() => vote(c.cid, 1)}
                    className={`p-1 rounded-lg transition-colors ${uv === 1 ? "text-[#E8960C] bg-amber-50" : "text-[#CBD5E1] hover:text-[#E8960C] hover:bg-amber-50"}`}
                  >
                    <ChevronUp size={22} strokeWidth={2.5} />
                  </button>
                  <span className={`text-[15px] font-700 tabular-nums leading-none py-0.5 ${scoreColor(s)}`}>
                    {s}
                  </span>
                  <button
                    onClick={() => vote(c.cid, -1)}
                    className={`p-1 rounded-lg transition-colors ${uv === -1 ? "text-[#0057FF] bg-blue-50" : "text-[#CBD5E1] hover:text-[#0057FF] hover:bg-blue-50"}`}
                  >
                    <ChevronDown size={22} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-600 text-[#0D1117] leading-snug">{c.text}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                    <span className={`text-[11px] rounded-full px-2 py-0.5 font-semibold border ${PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE["กลาง"]}`}>
                      {c.priority}
                    </span>
                    <span className="text-[11px] bg-[#EFF6FF] text-[#0057FF] rounded-full px-2 py-0.5 font-medium">{c.district || "ไม่ระบุเขต"}</span>
                    <span className="text-[11px] bg-[#F8FAFC] text-[#334155] rounded-full px-2 py-0.5 border border-[#E2E8F0]">{c.category}</span>
                    <span className="text-[11px] text-[#CBD5E1] hidden sm:inline">{c.department}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 mt-2 text-[11px] text-[#94A3B8]">
                    <span>รับเรื่อง {c.received ?? "—"}</span>
                    {c.expected_done && (
                      <span className="text-[#E8960C]">คาดเสร็จ {c.expected_done}</span>
                    )}
                    <span className="text-[11px] text-[#94A3B8] font-medium">{c.predicted_days} วัน</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
