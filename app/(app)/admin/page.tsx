"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Camera, X, Loader2, Lock, LogOut, History,
  Search as Search2, ChevronLeft, ChevronRight, Navigation
} from "lucide-react";
import Link from "next/link";
import SectionHeader from "@/components/section-header";
import EmptyState from "@/components/empty-state";
import { SkeletonList } from "@/components/skeleton";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "bdi_admin_token";
const USER_KEY  = "bdi_admin_user";

interface PendingRow {
  cid: string;
  text: string;
  district: string;
  category: string;
  department: string;
  ai_suggested_dept: string;
  received: string | null;
  expected_done: string | null;
  overdue: boolean;
}

interface Session {
  username: string;
  token: string;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const username = localStorage.getItem(USER_KEY);
    if (token && username) setSession({ token, username });
    setChecked(true);
  }, []);

  function handleLogout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setSession(null);
  }

  if (!checked) return null; // กัน flash ตอน hydrate

  if (!session) {
    return (
      <LoginForm
        onLogin={(username, token) => {
          localStorage.setItem(TOKEN_KEY, token);
          localStorage.setItem(USER_KEY, username);
          setSession({ username, token });
        }}
      />
    );
  }

  return <AdminPanel session={session} onUnauthorized={handleLogout} onLogout={handleLogout} />;
}

function LoginForm({ onLogin }: { onLogin: (username: string, token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "เข้าสู่ระบบไม่สำเร็จ");
      }
      const data = await res.json();
      onLogin(data.username, data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เชื่อมต่อ API ไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-2xl p-8 w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-4">
          <Lock size={20} className="text-[#0057FF]" />
        </div>
        <h2 className="text-[16px] font-700 text-[#0D1117] mb-1">สำหรับเจ้าหน้าที่เท่านั้น</h2>
        <p className="text-[12.5px] text-[#94A3B8] mb-5">เข้าสู่ระบบด้วยชื่อผู้ใช้ของคุณ</p>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ชื่อผู้ใช้"
          autoFocus
          className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[14px] text-center mb-2.5 focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          className="w-full border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-[14px] text-center mb-3 focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF]"
        />

        {error && (
          <p className="text-[12px] text-red-600 mb-3">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          className="w-full flex items-center justify-center gap-2 bg-[#0057FF] text-white rounded-xl py-2.5 text-[13.5px] font-600 hover:bg-[#0046CC] transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          เข้าสู่ระบบ
        </button>
      </form>
    </div>
  );
}

function authHeaders(session: Session): Record<string, string> {
  // HTTP header ไม่รองรับ UTF-8 ตรงๆ (encode เป็น latin-1 เท่านั้น) ต้อง encode ชื่อผู้ใช้ภาษาไทยก่อนส่งเสมอ
  return {
    "X-Admin-User": encodeURIComponent(session.username),
    "X-Admin-Token": session.token,
  };
}

interface AuditEntry {
  cid: string;
  action: string;
  by: string;
  at: string;
}

function AdminPanel({
  session, onUnauthorized, onLogout,
}: { session: Session; onUnauthorized: () => void; onLogout: () => void }) {
  const [rows, setRows]       = useState<PendingRow[]>([]);
  const [total, setTotal]     = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [openCid, setOpenCid] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [log, setLog]         = useState<AuditEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]   = useState("");
  const [district, setDistrict] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [districts, setDistricts] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/taxonomy`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setDistricts(d.districts); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  function load() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: "20",
      ...(search ? { search } : {}),
      ...(district ? { district } : {}),
      ...(overdueOnly ? { overdue_only: "true" } : {}),
    });
    fetch(`${API}/pending-predictions?${params.toString()}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((data) => {
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
      .catch((e) => setError(e instanceof Error ? e.message : "เชื่อมต่อ API ไม่ได้"))
      .finally(() => setLoading(false));
  }

  useEffect(load, [page, search, district, overdueOnly]);

  function handleCompleted(cid: string) {
    setRows((rs) => rs.filter((r) => r.cid !== cid));
    setTotal((t) => Math.max(0, t - 1));
    setOpenCid(null);
  }

  function resetFilters() {
    setSearchInput(""); setSearch(""); setDistrict(""); setOverdueOnly(false); setPage(1);
  }

  async function toggleLog() {
    if (!showLog) {
      setLogLoading(true);
      try {
        const res = await fetch(`${API}/admin/audit-log`, { headers: authHeaders(session) });
        if (res.status === 401) { onUnauthorized(); return; }
        setLog(await res.json());
      } catch {
        // เงียบไว้ — ไม่ critical ถ้าโหลด log ไม่ขึ้น
      } finally {
        setLogLoading(false);
      }
    }
    setShowLog((s) => !s);
  }

  const hasActiveFilter = !!(search || district || overdueOnly);

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <SectionHeader icon={<ShieldCheck />} title="จัดการคำร้อง (สำหรับเจ้าหน้าที่)" badge="ADMIN" />
        <div className="flex items-center gap-3 shrink-0 mt-1">
          <span className="text-[12.5px] text-[#64748B]">สวัสดี, <strong className="text-[#0D1117]">{session.username}</strong></span>
          <button onClick={onLogout} className="flex items-center gap-1.5 text-[12.5px] text-[#94A3B8] hover:text-red-600 transition-colors">
            <LogOut size={13} /> ออกจากระบบ
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={toggleLog}
          className="flex items-center gap-1.5 text-[12.5px] text-[#0057FF] hover:underline"
        >
          <History size={13} /> {showLog ? "ซ่อนประวัติการปิดงาน" : "ดูประวัติการปิดงาน (audit log)"}
        </button>
        
        <Link 
          href="/admin/routing"
          className="flex items-center gap-1.5 text-[12.5px] text-[#0057FF] hover:underline"
        >
          <Navigation size={13} /> จัดระบบเส้นทาง (Routing)
        </Link>
      </div>

      {showLog && (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 mb-5">
          {logLoading ? (
            <p className="text-[12.5px] text-[#94A3B8] text-center py-4">กำลังโหลด...</p>
          ) : log.length === 0 ? (
            <p className="text-[12.5px] text-[#94A3B8] text-center py-4">ยังไม่มีประวัติการปิดงาน</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-[12.5px] border-b border-[#F1F5F9] pb-2 last:border-0 last:pb-0">
                  <span>#{entry.cid} — {entry.action} โดย <strong>{entry.by}</strong></span>
                  <span className="text-[#94A3B8]">{entry.at}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
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

      {!loading && !error && total > 0 && (
        <p className="text-[13px] text-[#64748B] mb-4">
          คำร้องที่รอดำเนินการทั้งหมด <strong className="text-[#0D1117]">{total.toLocaleString()}</strong> รายการ
        </p>
      )}

      {loading && <SkeletonList rows={5} />}

      {error && (
        <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-[13px] text-red-700">
          <AlertTriangle size={15} className="shrink-0 text-red-500 mt-0.5" /> {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <EmptyState
          icon={<CheckCircle2 size={22} />}
          title="ไม่มีคำร้องค้างดำเนินการ"
          hint="คำร้องทั้งหมดได้รับการจัดการเรียบร้อยแล้ว"
        />
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <AdminRow
              key={r.cid}
              row={r}
              session={session}
              open={openCid === r.cid}
              onToggle={() => setOpenCid(openCid === r.cid ? null : r.cid)}
              onCompleted={() => handleCompleted(r.cid)}
              onUnauthorized={onUnauthorized}
            />
          ))}
        </div>
      )}

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

function AdminRow({
  row, session, open, onToggle, onCompleted, onUnauthorized,
}: {
  row: PendingRow; session: Session; open: boolean; onToggle: () => void;
  onCompleted: () => void; onUnauthorized: () => void;
}) {
  const [photo, setPhoto]   = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Department state — เริ่มด้วยค่าปัจจุบัน (ซึ่ง AI กำหนดมาตอนรับคำร้อง)
  const [department, setDepartment] = useState(row.department);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptSaved, setDeptSaved]   = useState(false);
  const [departments, setDepartments] = useState<string[]>([]);

  // โหลดรายชื่อฝ่ายจาก taxonomy เมื่อ expand
  useEffect(() => {
    if (!open || departments.length > 0) return;
    fetch(`${API}/taxonomy`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.departments) setDepartments(d.departments); })
      .catch(() => {});
  }, [open, departments.length]);

  async function handleDeptChange(newDept: string) {
    setDepartment(newDept);
    setDeptSaved(false);
    setDeptSaving(true);
    try {
      const res = await fetch(`${API}/complaints/${encodeURIComponent(row.cid)}/department`, {
        method: "PATCH",
        headers: { ...authHeaders(session), "Content-Type": "application/json" },
        body: JSON.stringify({ department: newDept }),
      });
      if (res.status === 401) { onUnauthorized(); return; }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      setDeptSaved(true);
      setTimeout(() => setDeptSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เปลี่ยนหน่วยงานไม่สำเร็จ");
      setDepartment(row.department); // rollback
    } finally {
      setDeptSaving(false);
    }
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleComplete() {
    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      if (photo) fd.append("after_photo", photo);
      const res = await fetch(`${API}/complaints/${encodeURIComponent(row.cid)}/complete`, {
        method: "POST",
        headers: authHeaders(session),
        body: fd,
      });
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? `HTTP ${res.status}`);
      }
      onCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ปิดงานไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden ${row.overdue ? "border-red-200" : "border-[#E2E8F0]"}`}>
      <button onClick={onToggle} className="w-full text-left px-5 py-4 flex items-center gap-3">
        {row.overdue && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-[13.5px] font-600 text-[#0D1117] truncate">{row.text}</p>
          <p className="text-[11.5px] text-[#94A3B8] mt-0.5">
            #{row.cid} · {row.district} · {row.category}
            {row.expected_done && <> · คาดเสร็จ {row.expected_done}</>}
          </p>
        </div>
        {row.overdue && (
          <span className="text-[11px] font-700 text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 shrink-0">
            ค้างเกินกำหนด
          </span>
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-[#F1F5F9] pt-4 space-y-3">
          <p className="text-[12px] text-[#94A3B8]">รับเรื่อง: {row.received ?? "—"}</p>

          {/* Department section */}
          <div className="bg-[#F8FAFC] rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-600 text-[#334155]">หน่วยงานที่รับผิดชอบ</span>
              <span className="inline-flex items-center gap-1 text-[10.5px] font-600 text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                AI แนะนำ: {row.ai_suggested_dept}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={department}
                onChange={(e) => handleDeptChange(e.target.value)}
                disabled={deptSaving}
                className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-[12.5px] text-[#0D1117] focus:outline-none focus:ring-2 focus:ring-[#0057FF]/30 focus:border-[#0057FF] bg-white disabled:opacity-60"
              >
                {departments.length === 0 && <option value={department}>{department}</option>}
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {deptSaving && (
                <Loader2 size={14} className="animate-spin text-[#94A3B8] shrink-0" />
              )}
              {deptSaved && (
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-[12px] text-red-700">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
            </div>
          )}

          {preview ? (
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="รูปหลังแก้ไข" className="rounded-xl max-h-32 border border-[#E2E8F0] object-cover" />
              <button
                onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#0D1117] text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-[#E2E8F0] rounded-xl py-4 cursor-pointer hover:border-[#0057FF]/40 text-[12.5px] text-[#94A3B8] transition-colors">
              <Camera size={15} /> แนบรูปหลังแก้ไข (ถ้ามี)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} className="hidden" />
            </label>
          )}

          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-2.5 text-[13px] font-600 hover:bg-emerald-700 transition-colors disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {submitting ? "กำลังบันทึก..." : `ปิดงาน — ดำเนินการเสร็จสิ้น (โดย ${session.username})`}
          </button>
        </div>
      )}
    </div>
  );
}
