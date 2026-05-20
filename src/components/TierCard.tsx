import { FancyTier } from "@/lib/utils";
import { Crown, Sparkles, Gem } from "lucide-react";

interface TierCardProps {
  tier: 1 | 2 | 3;
  count: number;
  active: boolean;
  onClick: () => void;
}

const TIER_META = {
  1: {
    label: "Tier 1 Premium",
    desc: "All same digit · palindrome · pure sequence · 4+ identical tail",
    icon: Crown,
    colors: {
      border: "border-violet-200",
      bg: "bg-violet-50",
      iconBg: "bg-violet-100",
      icon: "text-violet-600",
      count: "text-violet-700",
      label: "text-violet-700",
      glow: "shadow-violet-100",
    },
  },

  2: {
    label: "Tier 2 Choice",
    desc: "3-same tail · 3+ digit pairs · repeating pattern",
    icon: Sparkles,
    colors: {
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      icon: "text-emerald-600",
      count: "text-emerald-700",
      label: "text-emerald-700",
      glow: "shadow-emerald-100",
    },
  },

  3: {
    label: "Tier 3 Notable",
    desc: "Double ending · mirrored pairs · near-fancy pattern",
    icon: Gem,
    colors: {
      border: "border-rose-200",
      bg: "bg-rose-50",
      iconBg: "bg-rose-100",
      icon: "text-rose-600",
      count: "text-rose-700",
      label: "text-rose-700",
      glow: "shadow-rose-100",
    },
  },
};

export function TierCard({
  tier,
  count,
  active,
  onClick,
}: TierCardProps) {
  const meta = TIER_META[tier];
  const colors = meta.colors;

  const Icon = meta.icon;

  return (
    <button
      onClick={onClick}
      className={`
        relative w-full overflow-hidden rounded-3xl border bg-white p-5 text-left
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-2xl
        ${active
          ? `${colors.border} ${colors.bg} shadow-xl ${colors.glow}`
          : "border-slate-200 hover:border-slate-300"
        }
      `}
    >
      {/* Top */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.18em] ${colors.label}`}
          >
            {meta.label}
          </p>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            {meta.desc}
          </p>
        </div>

        <div
          className={`
            flex h-12 w-12 items-center justify-center rounded-2xl
            ${colors.iconBg}
          `}
        >
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </div>

      {/* Count */}
      <div className="flex items-end justify-between">
        <div>
          <h2
            className={`text-4xl font-black tracking-tight ${colors.count}`}
          >
            {count}
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-400">
            Fancy Numbers
          </p>
        </div>

        {active && (
          <div
            className={`
              rounded-full px-3 py-1 text-[11px] font-semibold
              ${colors.bg} ${colors.label}
            `}
          >
            Active
          </div>
        )}
      </div>

      {/* Decorative Gradient */}
      <div
        className={`
          absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-30
          ${colors.bg}
        `}
      />
    </button>
  );
}