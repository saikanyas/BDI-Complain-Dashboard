interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  badge?: string;
}

export default function SectionHeader({ icon, title, badge }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-5 pb-3 border-b-2 border-[#E2E8F0]">
      <span className="text-[#0057FF] text-xl">{icon}</span>
      <h2 className="text-[18px] font-800 text-[#0D1117] tracking-tight">{title}</h2>
      {badge && (
        <span className="text-[11px] font-700 uppercase tracking-wider text-[#0057FF] bg-[#F8FAFC] border border-[#E2E8F0] rounded-full px-3 py-0.5">
          {badge}
        </span>
      )}
    </div>
  );
}
