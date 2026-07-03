"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown, AlertTriangle, Sparkles, Search, ChevronLeft, ChevronRight, X } from "lucide-react";
import SectionHeader from "@/components/section-header";
import { SkeletonList } from "@/components/skeleton";
import EmptyState from "@/components/empty-state";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const STORAGE_KEY = "bdi_votes_v2";
const PAGE_SIZE = 20;

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
  confidence?: "สูง" | "กลาง" | "ต่ำ";
  sample_size?: number;
  ai_assessed?: boolean;
  overdue?: boolean;
}

interface PendingResponse {
  items: PendingRow[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
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
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [userVotes, setUserVotes] = useState<UserVotes>({});
  const [sortBy, setSortBy] = useState<"votes" | "date">("votes");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");
  const [district, setDistrict] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);

  // โหลดรายชื่อเขตสำหรับ dropdown filter (ครั้งเดียว)
  useEffect(() => {
    setUserVotes(loadVotes());
    fetch(`${API}/taxonomy`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setDistricts(d.districts); })
      .catch(() => {});
  }, []);

  // debounce ช่องค้นหา กันยิง API ถี่เกินไปทุกตัวอักษรที่พิมพ์
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      ...(search ? { search } : {}),
      ...(district ? { district } : {}),
      ...(overdueOnly ? { overdue_only: "true" } : {}),
    });
    fetch(`${API}/pending-predictions?${params.toString()}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: PendingResponse | PendingRow[]) => {
        // รองรับทั้ง API ใหม่ { items: [...] } และ API เก่าที่ส่ง Array โดยตรง
        if (Array.isArray(data)) {
          setRows(data);
          setTotal(data.length);
          setTotalPages(1);
        } else {
          setRows(data.items ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.total_pages ?? 1);
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, district, overdueOnly]);

  function vote(cid: string, dir: 1 | -1) {
    setUserVotes((prev) => {
      const cur = prev[cid] ?? 0;
      const next: UserVotes = { ...prev, [cid]: cur === dir ? 0 : dir };
      saveVotes(next);
      return next;
    });
  }

  function resetFilters() {
    setSearchInput(""); setSearch(""); setDistrict(""); setOverdueOnly(false); setPage(1);
  }

  const sorted = [...rows].sort((a, b) => {
    if (sortBy === "date") {
      return (a.expected_done ?? "9999") < (b.expected_done ?? "9999") ? -1 : 1;
    }
    return netScore(b.cid, userVotes) - netScore(a.cid, userVotes);
  });

  const hasActiveFilter = !!(search || district || overdueOnly);

  return (
    <div>
      <SectionHeader
        icon={<ChevronUp size={20} />}
        title="ลงคะแนนคำร้องที่รอดำเนินการ"
        badge={loading ? "..." : `${total.toLocaleString()} รายการ`}
      />

      <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-[13px] text-amber-800">
        <AlertTriangle size={15} className="shrink-0 text-amber-500" />
        <span>คำร้องมาจากข้อมูลจริง · <strong>คะแนนโหวตเริ่มต้นเป็นข้อมูลสาธิตเพื่อ prototype เท่านั้น</strong> · คะแนนที่คุณโหวตจะถูกบันทึกไว้ในเบราว์เซอร์</span>
      </div>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหาเลขคำร้องหรือข้อความ..."
            className="w-full border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
          />
        </div>

        <select
          value={district}
          onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
          className="border border-[#E2E8F0] rounded-xl px-3 py-2 text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30"
        >
          <option value="">ทุกเขต</option>
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <button
          onClick={() => { setOverdueOnly((v) => !v); setPage(1); }}
          className={`text-[12.5px] px-3 py-2 rounded-xl border transition-colors whitespace-nowrap ${
            overdueOnly ? "bg-red-50 text-red-600 border-red-200" : "bg-white text-[#334155] border-[#E2E8F0] hover:border-red-300 transition-colors"
          }`}
        >
          เฉพาะที่ค้างเกินกำหนด
        </button>

        {hasActiveFilter && (
          <button onClick={resetFilters} className="flex items-center gap-1 text-[12.5px] text-[#94A3B8] hover:text-red-600 transition-colors">
            <X size={13} /> ล้าง filter
          </button>
        )}
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
                : "bg-white text-[#334155] border-[#E2E8F0] hover:border-[#0057FF] hover:text-[#0057FF] transition-colors"
            }`}
          >
            {opt === "votes" ? "คะแนนโหวต" : "วันที่คาดเสร็จ"}
          </button>
        ))}
      </div>

      {loading && <SkeletonList rows={6} />}

      {error && (
        <div className="flex flex-col items-center justify-center h-48 gap-1">
          <p className="text-[#E5484D] font-medium">เชื่อมต่อ API ไม่ได้</p>
          <p className="text-[#94A3B8] text-xs">{API}</p>
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<Search size={22} />}
          title="ไม่พบคำร้องที่ตรงกับเงื่อนไข"
          hint={hasActiveFilter ? "ลองล้าง filter หรือเปลี่ยนคำค้นหา" : "ยังไม่มีคำร้องที่รอดำเนินการ"}
        />
      )}

      {!loading && !error && rows.length > 0 && (
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
                    {c.ai_assessed && (
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-[#0057FF] bg-[#EFF6FF] rounded-full px-2 py-0.5">
                        <Sparkles size={9} /> AI
                      </span>
                    )}
                    {c.overdue && (
                      <span className="text-[10.5px] text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5 font-semibold">
                        ค้างเกินกำหนด
                      </span>
                    )}
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
                    {c.confidence && (
                      <span
                        className="text-[11px] font-medium flex items-center gap-1"
                        title={`อิงจากคำร้องในอดีต ${c.sample_size ?? 0} รายการ`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          c.confidence === "สูง" ? "bg-emerald-500" : c.confidence === "กลาง" ? "bg-amber-500" : "bg-red-400"
                        }`} />
                        มั่นใจ{c.confidence}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-lg border border-[#E2E8F0] text-[#334155] disabled:opacity-40 hover:border-[#0057FF] disabled:hover:border-[#E2E8F0] transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="text-[13px] text-[#64748B] px-2">
            หน้า <strong className="text-[#0D1117]">{page}</strong> / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-lg border border-[#E2E8F0] text-[#334155] disabled:opacity-40 hover:border-[#0057FF] disabled:hover:border-[#E2E8F0] transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
