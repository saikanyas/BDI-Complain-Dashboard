interface KpiCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon: React.ReactNode;
  description?: string;
}

export default function KpiCard({ label, value, sub, color = "#0057FF", icon, description }: Readonly<KpiCardProps>) {
  return (
    <div className="relative group">
      <div
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-default"
        style={{ borderTop: `3px solid ${color}` }}
      >
        <div className="text-xl mb-2" style={{ color }}>{icon}</div>
        <div className="text-[20px] font-800 text-[#0D1117] tabular-nums leading-none tracking-tight">
          {value}
        </div>
        <div className="text-[11px] font-700 uppercase tracking-widest text-[#94A3B8] mt-1.5">
          {label}
        </div>
        {sub && <div className="text-[13px] text-[#334155] mt-1">{sub}</div>}
      </div>

      {description && (
        <div className="absolute bottom-full left-0 mb-2 w-full min-w-[180px] bg-[#1E293B] text-white text-[12px] rounded-xl px-3 py-2.5 leading-relaxed
                        opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 z-50 shadow-xl">
          {description}
          <div className="absolute top-full left-5 border-[5px] border-transparent border-t-[#1E293B]" />
        </div>
      )}
    </div>
  );
}
