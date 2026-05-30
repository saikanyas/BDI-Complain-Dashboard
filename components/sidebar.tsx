"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart2, Timer, Map, Building2, BrainCircuit, ChevronRight, X, ClipboardPlus
} from "lucide-react";

const NAV = [
  { href: "/",            label: "ภาพรวม",              icon: LayoutDashboard },
  { href: "/complaints",  label: "วิเคราะห์คำร้อง",     icon: BarChart2       },
  { href: "/performance", label: "ประสิทธิภาพ & SLA",    icon: Timer           },
  { href: "/district",    label: "วิเคราะห์แยกตามเขต",  icon: Map             },
  { href: "/predict",     label: "ลงคะแนนคำร้อง",       icon: BrainCircuit    },
  { href: "/submit",      label: "ยื่นคำร้อง",           icon: ClipboardPlus   },
];

export default function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <button
          aria-label="ปิด sidebar"
          className="fixed inset-0 bg-black/40 z-20 lg:hidden w-full cursor-default border-0 p-0"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static z-30 lg:z-auto
        w-[240px] shrink-0 bg-white border-r border-[#E2E8F0]
        flex flex-col h-screen
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0057FF] flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-800 text-[#0D1117] leading-tight">
                Complaint Intelligence
              </p>
              <p className="text-[11px] text-[#94A3B8] leading-tight mt-0.5">
                เทศบาลนครขอนแก่น · v1.0
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-[#94A3B8] hover:text-[#334155] p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => window.innerWidth < 1024 && setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-500 transition-colors ${
                  active
                    ? "bg-[#EFF6FF] text-[#0057FF]"
                    : "text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0D1117]"
                }`}
              >
                <Icon size={16} className={active ? "text-[#0057FF]" : "text-[#94A3B8]"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#E2E8F0]">
          <p className="text-[11px] text-[#CBD5E1] text-center leading-relaxed">
            Smart City Intelligence Platform<br />
            GovTech Innovation · Khon Kaen
          </p>
        </div>
      </aside>

      {/* Drawer tab — sticks out from left edge when sidebar is closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 z-40 lg:hidden
                     bg-white border border-l-0 border-[#E2E8F0]
                     rounded-r-xl shadow-md px-1 py-4 flex items-center"
        >
          <ChevronRight size={16} className="text-[#334155]" />
        </button>
      )}
    </>
  );
}
