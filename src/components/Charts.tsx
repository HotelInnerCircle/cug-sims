"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

import {
  Wifi,
  Building2,
  Crown,
} from "lucide-react";

import { Connection } from "@/lib/utils";

interface ChartsProps {
  data: Connection[];
}

const NETWORK_COLORS: Record<string, string> = {
  Airtel: "#ef4444",
  Vodafone: "#8b5cf6",
  Jio: "#3b82f6",
  Vi: "#6366f1",
  Unknown: "#64748b",
};

const COMPANY_COLORS: Record<string, string> = {
  HIC: "#06b6d4",
  RKS: "#10b981",
  SAZ: "#f59e0b",
};

const TIER_COLORS = [
  "#8b5cf6",
  "#10b981",
  "#f43f5e",
  "#64748b",
];

const TooltipStyle = {
  backgroundColor: "white",
  border: "1px solid #1e293b",
  borderRadius: "14px",
  color: "black",
  fontSize: "12px",
  boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
};

export function Charts({ data }: ChartsProps) {
  // Network breakdown
  const netMap: Record<string, number> = {};

  function normalizeNetwork(n: string): string {
    const lower = (n || "").trim().toLowerCase();
    if (lower === "airtel") return "Airtel";
    if (lower === "vodafone") return "Vodafone";
    if (lower === "jio") return "Jio";
    if (lower === "vi") return "Vi";
    return (n || "").trim() || "Unknown";
  }

  data.forEach((r) => {
    const n = normalizeNetwork(r.network);
    netMap[n] = (netMap[n] || 0) + 1;
  });

  const netData = Object.entries(netMap)
    .filter(([k]) => k !== "Unknown" && k !== "")
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  // Company breakdown
  const coMap: Record<string, number> = {
    HIC: 0,
    RKS: 0,
    SAZ: 0,
  };

  data.forEach((r) => {
    if (coMap[r.company] !== undefined) {
      coMap[r.company]++;
    }
  });

  const coData = Object.entries(coMap).map(([name, value]) => ({
    name,
    value,
  }));

  // Fancy tier breakdown
  const tierMap = {
    "Tier 1": 0,
    "Tier 2": 0,
    "Tier 3": 0,
    Regular: 0,
  };

  data.forEach((r) => {
    if (r.fancy_tier === 1) tierMap["Tier 1"]++;
    else if (r.fancy_tier === 2) tierMap["Tier 2"]++;
    else if (r.fancy_tier === 3) tierMap["Tier 3"]++;
    else tierMap["Regular"]++;
  });

  const tierData = Object.entries(tierMap).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* NETWORK CHART */}
      <div className="relative p-5 overflow-hidden text-black bg-white border shadow-2xl rounded-3xl border-slate-800">
        <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center text-blue-400 h-11 w-11 rounded-2xl bg-blue-500/20">
            <Wifi size={20} />
          </div>

          <div>
            <h3 className="text-sm font-semibold ">
              Network Analytics
            </h3>

            <p className="text-xs text-slate-600">
              Connections by network
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={netData}
            margin={{
              top: 10,
              right: 10,
              left: -15,
              bottom: 0,
            }}
            barSize={34}
          >
            <CartesianGrid
              vertical={false}
              strokeDasharray="3 3"
              stroke="#1e293b"
            />

            <XAxis
              dataKey="name"
              tick={{
                fill: "#cbd5e1",
                fontSize: 12,
                fontWeight: 600,
              }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              tick={{
                fill: "#94a3b8",
                fontSize: 11,
              }}
              axisLine={false}
              tickLine={false}
              width={30}
            />

            <Tooltip
              contentStyle={TooltipStyle}
              cursor={{
                fill: "rgba(255,255,255,0.04)",
              }}
            />

            <Bar
              dataKey="value"
              radius={[14, 14, 0, 0]}
              
            >
              {netData.map((entry) => (
                <Cell
                  key={entry.name}
                  className="text-black"
                  fill={NETWORK_COLORS[entry.name] ?? "#64748b"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* COMPANY DONUT */}
      <div className="relative p-5 overflow-hidden border shadow-2xl rounded-3xl border-slate-800 ">
        <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center h-11 w-11 rounded-2xl bg-cyan-500/20 text-cyan-400">
            <Building2 size={20} />
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Company Distribution
            </h3>

            <p className="text-xs text-slate-400">
              Leads by company
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={coData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={4}
            >
              {coData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COMPANY_COLORS[entry.name] ?? "#64748b"}
                />
              ))}
            </Pie>

            <Tooltip contentStyle={TooltipStyle} />

            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs text-slate-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* FANCY TIER */}
      <div className="relative p-5 overflow-hidden border shadow-2xl rounded-3xl border-slate-800 ">
        <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center text-pink-400 h-11 w-11 rounded-2xl bg-pink-500/20">
            <Crown size={20} />
          </div>

          <div>
            <h3 className="text-sm font-semibold ">
              Fancy Tier Split
            </h3>

            <p className="text-xs text-slate-400">
              Premium number categories
            </p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={tierData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={82}
              paddingAngle={4}
            >
              {tierData.map((_, i) => (
                <Cell
                  key={i}
                  fill={TIER_COLORS[i]}
                />
              ))}
            </Pie>

            <Tooltip contentStyle={TooltipStyle} />

            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span className="text-xs text-slate-300">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}