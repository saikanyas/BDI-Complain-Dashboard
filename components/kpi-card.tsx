interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
}

export default function KpiCard({ label, value, sub, color = "#0057FF", icon }: KpiCardProps) {
  return (
    <div
      className="bg-white rounded-2xl border border-[#E2E8F0] p-5 relative overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
      style={{ borderTop: `3px solid ${color}` }}
    >
      <div className="text-xl mb-2" style={{ color }}>{icon}</div>
      <div className="text-3xl font-800 text-[#0D1117] tabular-nums leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[11px] font-700 uppercase tracking-widest text-[#94A3B8] mt-1.5">
        {label}
      </div>
      {sub && <div className="text-[13px] text-[#334155] mt-1">{sub}</div>}
    </div>
  );
}
