"use client";

import { useState, useMemo } from "react";
import { Connection, FancyTier, Filters } from "@/lib/utils";
import { MetricCard } from "@/components/MetricCard";
import { TierCard } from "@/components/TierCard";
import { ConnectionsTable } from "@/components/ConnectionsTable";
import { Charts } from "@/components/Charts";
import { LogoutButton } from "@/components/LogoutButton";

interface DashboardProps {
  connections: Connection[];
  userName?: string;
}

const PER_PAGE = 20;

export function Dashboard({ connections, userName = "Admin" }: DashboardProps) {
  const [filters, setFilters] = useState<Filters>({
    search: "",
    company: "",
    network: "",
    plan: "",
    tier: null,
  });
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return connections.filter((r) => {
      if (filters.company && r.company !== filters.company) return false;
      if (filters.tier !== null && r.fancy_tier !== filters.tier) return false;
      if (filters.network && r.network.toLowerCase() !== filters.network.toLowerCase()) return false;
      if (filters.plan === "post" && !r.plan_type.toLowerCase().includes("post")) return false;
      if (filters.plan === "pre" && !r.plan_type.toLowerCase().includes("pre")) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !(r.mobile || "").includes(q) &&
          !(r.name || "").toLowerCase().includes(q) &&
          !(r.department || "").toLowerCase().includes(q) &&
          !(r.designation || "").toLowerCase().includes(q) &&
          !(r.location || "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [connections, filters]);

  const stats = useMemo(() => {
    const postpaid = filtered.filter((r) => r.plan_type.toLowerCase().includes("post")).length;
    const fancy = filtered.filter((r) => r.fancy_tier).length;
    const nets: Record<string, number> = {};
    filtered.forEach((r) => { const n = r.network || "Unknown"; nets[n] = (nets[n] || 0) + 1; });
    const topNet = Object.entries(nets).sort((a, b) => b[1] - a[1])[0];
    return {
      total: filtered.length,
      postpaid,
      fancy,
      topNet: topNet ? `${topNet[0]} (${topNet[1]})` : "—",
      t1: filtered.filter((r) => r.fancy_tier === 1).length,
      t2: filtered.filter((r) => r.fancy_tier === 2).length,
      t3: filtered.filter((r) => r.fancy_tier === 3).length,
    };
  }, [filtered]);

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  function toggleTier(t: FancyTier) {
    setFilter("tier", filters.tier === t ? null : t);
  }

  const companies = ["", "HIC", "RKS", "SAZ"] as const;
  const companyLabels: Record<string, string> = { "": "All Companies", HIC: "HIC", RKS: "RKS", SAZ: "SAZ" };
  const companyActive: Record<string, string> = {
    "": "bg-slate-700 border-slate-600 text-slate-100",
    HIC: "bg-sky-900/70 border-sky-600/60 text-sky-200",
    RKS: "bg-teal-900/70 border-teal-600/60 text-teal-200",
    SAZ: "bg-amber-900/70 border-amber-600/60 text-amber-200",
  };
  const companyIdle = "border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300";

  return (
    <div className="min-h-screen text-black bg-white">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-4 px-6 py-3 mx-auto max-w-screen-2xl">

          {/* Brand */}
          <div className="flex items-center flex-shrink-0 gap-3">
            <div className="flex items-center justify-center w-8 h-8 shadow-lg rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-indigo-500/30">
              <span className="text-sm font-bold text-white">S</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold leading-none text-slate-100">Saboo CUG Dashboard</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {connections.length} connections · HIC · RKS · SAZ
              </p>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap justify-center flex-1 gap-2">
            <input
              type="text"
              placeholder="Search name, number, dept…"
              className="filter-input w-52"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
            <select
              className="filter-input"
              value={filters.network}
              onChange={(e) => setFilter("network", e.target.value)}
            >
              <option value="">All networks</option>
              <option>Airtel</option>
              <option>Vodafone</option>
              <option>Jio</option>
              <option>Vi</option>
            </select>
            <select
              className="filter-input"
              value={filters.plan}
              onChange={(e) => setFilter("plan", e.target.value)}
            >
              <option value="">All plans</option>
              <option value="post">Postpaid</option>
              <option value="pre">Prepaid</option>
            </select>
          </div>

          {/* User area */}
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[10px] font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs font-medium text-slate-300">{userName}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="px-6 py-6 mx-auto space-y-5 max-w-screen-2xl">

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard
            label="Total connections"
            value={stats.total}
            sub={filters.company || "All companies"}
          />
          <MetricCard
            label="Postpaid"
            value={stats.postpaid}
            sub={`${Math.round((stats.postpaid / (stats.total || 1)) * 100)}% of total`}
            accent="text-emerald-400"
          />
          <MetricCard
            label="Fancy numbers"
            value={stats.fancy}
            sub="Tier 1–3 combined"
            accent="text-violet-400"
          />
          <MetricCard label="Top network" value={stats.topNet} />
          <MetricCard
            label="Prepaid"
            value={filtered.filter((r) => r.plan_type.toLowerCase().includes("pre")).length}
            sub={`${Math.round((filtered.filter((r) => r.plan_type.toLowerCase().includes("pre")).length / (stats.total || 1)) * 100)}% of total`}
            accent="text-amber-400"
          />
        </div>

        {/* Company tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium text-slate-600 uppercase tracking-widest mr-1">
            Company
          </span>
          {companies.map((co) => (
            <button
              key={co}
              onClick={() => setFilter("company", co)}
              className={`company-tab ${filters.company === co ? companyActive[co] : companyIdle}`}
            >
              {companyLabels[co]}
            </button>
          ))}
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {([1, 2, 3] as const).map((t) => (
            <TierCard
              key={t}
              tier={t}
              count={t === 1 ? stats.t1 : t === 2 ? stats.t2 : stats.t3}
              active={filters.tier === t}
              onClick={() => toggleTier(t)}
            />
          ))}
        </div>

        {/* Charts */}
        <Charts data={filtered} />

        {/* Table section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-semibold ">CUG Connections</h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-xs text-slate-400">
                {filtered.length}
              </span>
              {filters.search || filters.company || filters.network || filters.plan || filters.tier !== null ? (
                <button
                  onClick={() => {
                    setFilters({ search: "", company: "", network: "", plan: "", tier: null });
                    setPage(1);
                  }}
                  className="text-xs text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
          </div>
          <ConnectionsTable
            data={filtered}
            page={page}
            perPage={PER_PAGE}
            onPageChange={setPage}
          />
        </section>
      </main>
    </div>
  );
}
