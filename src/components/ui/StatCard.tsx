import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  subtitle,
  trend,
}: StatCardProps) {
  // Map color to subtle top ambient accent glow
  const getAccentGradient = () => {
    if (iconColor.includes("blue") || iconColor.includes("sky"))
      return "from-blue-500/80 via-indigo-500/50 to-transparent";
    if (iconColor.includes("emerald"))
      return "from-emerald-500/80 via-teal-500/50 to-transparent";
    if (iconColor.includes("rose") || iconColor.includes("red"))
      return "from-rose-500/80 via-pink-500/50 to-transparent";
    if (iconColor.includes("purple"))
      return "from-purple-500/80 via-violet-500/50 to-transparent";
    if (iconColor.includes("amber") || iconColor.includes("orange"))
      return "from-amber-500/80 via-orange-500/50 to-transparent";
    return "from-slate-400/50 to-transparent";
  };

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white border border-slate-200/90 shadow-[0_4px_16px_-2px_rgba(15,23,42,0.04),0_1px_3px_0_rgba(15,23,42,0.02)] p-5 transition-all duration-200 hover:shadow-[0_10px_24px_-4px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 hover:border-slate-300">
      {/* Top subtle accent glow stripe */}
      <div className={`absolute top-0 inset-x-0 h-[2.5px] bg-gradient-to-r ${getAccentGradient()}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">
            {label}
          </p>
          <p className="text-2xl lg:text-[25px] font-extrabold text-slate-900 font-mono-nums tracking-tight leading-snug truncate">
            {value}
          </p>
        </div>
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border border-slate-200/60 shadow-xs transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
        >
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-slate-100/90 flex items-center justify-between text-xs gap-2">
          {subtitle && (
            <span className="text-[11px] text-slate-500 font-medium truncate leading-tight">
              {subtitle}
            </span>
          )}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold shrink-0 px-2 py-0.5 rounded-full border backdrop-blur-xs ${
                trend.positive
                  ? "text-emerald-700 bg-emerald-50/90 border-emerald-200/80 shadow-xs shadow-emerald-500/10"
                  : "text-rose-700 bg-rose-50/90 border-rose-200/80 shadow-xs shadow-rose-500/10"
              }`}
            >
              {trend.positive ? (
                <TrendingUp className="w-3 h-3 text-emerald-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-600" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
