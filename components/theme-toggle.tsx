"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("bdi_theme");
    const isDark = saved === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    queueMicrotask(() => {
      setDark(isDark);
      setMounted(true);
    });
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("bdi_theme", next ? "dark" : "light");
  }

  if (!mounted) return <div className="w-9 h-9" />; // กัน layout shift ตอน hydrate

  return (
    <button
      onClick={toggle}
      aria-label="สลับธีมสว่าง/มืด"
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-white/5 transition-colors"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
