interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  return (
    <div className="metric-card">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-semibold ${accent ?? "text-slate-100"}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}
