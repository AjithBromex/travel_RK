interface PageHeaderProps {
  title: string;
  subtitle: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-[26px] font-extrabold tracking-tight text-slate-900 leading-tight">
        {title}
      </h1>
      <p className="text-xs sm:text-[13px] text-slate-500 mt-1 font-medium leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
