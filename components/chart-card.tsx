interface ChartCardProps {
  title: string;
  sub?: string;
  children: React.ReactNode;
}

export default function ChartCard({ title, sub, children }: ChartCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5">
      {title && <p className="text-[14px] font-700 text-[#0D1117] mb-0.5">{title}</p>}
      {sub   && <p className="text-[12px] text-[#94A3B8] mb-3">{sub}</p>}
      {children}
    </div>
  );
}
