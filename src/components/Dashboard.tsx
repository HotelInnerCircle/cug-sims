"use client";

import { useState, useMemo } from "react";
import { Connection, FancyTier, Filters } from "@/lib/utils";
import { MetricCard } from "@/components/MetricCard";
import { TierCard } from "@/components/TierCard";
import { ConnectionsTable } from "@/components/ConnectionsTable";
import { Charts } from "@/components/Charts";
import { LogoutButton } from "@/components/LogoutButton";
import { BillingTable } from "@/components/BillingTable";

interface DashboardProps {
  connections: Connection[];
  userName?: string;
}

type Tab = "dashboard" | "billing";

const PER_PAGE = 20;

export function Dashboard({ connections, userName = "Admin" }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
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
<header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-2xl">
  <div className="px-4 mx-auto max-w-screen-2xl lg:px-6">
    <div className="flex flex-wrap items-center justify-between gap-4 py-3">

      {/* Left Section */}
      <div className="flex items-center gap-4">

        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl blur-lg bg-indigo-500/40"></div>

            <div className="relative flex items-center justify-center text-white shadow-xl w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-600 shadow-indigo-500/30">
              <span className="text-lg font-black tracking-wide">S</span>
            </div>
          </div>

          <div>
            <h1 className="text-sm font-bold tracking-wide text-white sm:text-base">
              Saboo CUG Portal
            </h1>

            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
              <span>{connections.length} Connections</span>

              <span className="w-1 h-1 rounded-full bg-slate-600"></span>

              <span>HIC</span>

              <span className="w-1 h-1 rounded-full bg-slate-600"></span>

              <span>RKS</span>

              <span className="w-1 h-1 rounded-full bg-slate-600"></span>

              <span>SAZ</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="items-center hidden p-1 border shadow-inner md:flex rounded-2xl bg-white/5 border-white/10 backdrop-blur-xl">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2
              ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>

            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`relative px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2
              ${
                activeTab === "billing"
                  ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>

            Billing
          </button>
        </div>
      </div>

      {/* Center Filters */}
      {activeTab === "dashboard" && (
        <div className="flex flex-wrap items-center justify-center flex-1 gap-3">

          {/* Search */}
          <div className="relative">
            <svg
              className="absolute w-4 h-4 -translate-y-1/2 left-3 top-1/2 text-slate-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              />
            </svg>

            <input
              type="text"
              placeholder="Search employee, number, department..."
              className="w-64 py-2 pl-10 pr-4 text-sm border rounded-xl bg-white/5 border-white/10 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
            />
          </div>

          {/* Network */}
          {/* <select
            className="px-4 py-2 text-sm border outline-none rounded-xl bg-white/5 border-white/10 text-slate-300 focus:ring-2 focus:ring-indigo-500/40"
            value={filters.network}
            onChange={(e) => setFilter("network", e.target.value)}
          >
            <option value="">All Networks</option>
            <option>Airtel</option>
            <option>Vodafone</option>
            <option>Jio</option>
            <option>Vi</option>
          </select> */}

          {/* Plan */}
          {/* <select
            className="px-4 py-2 text-sm border outline-none rounded-xl bg-white/5 border-white/10 text-slate-300 focus:ring-2 focus:ring-indigo-500/40"
            value={filters.plan}
            onChange={(e) => setFilter("plan", e.target.value)}
          >
            <option value="">All Plans</option>
            <option value="post">Postpaid</option>
            <option value="pre">Prepaid</option>
          </select> */}
        </div>
      )}

      {activeTab === "billing" && (
        <div className="flex-1 hidden lg:block">
          <div className="px-4 py-2 border rounded-xl w-fit bg-emerald-500/10 border-emerald-500/20">
            <p className="text-xs font-medium text-emerald-400">
              Billing Management Active
            </p>
          </div>
        </div>
      )}

      {/* Right Section */}
      <div className="flex items-center gap-3">

        {/* Notification */}
        <button className="relative flex items-center justify-center w-10 h-10 transition-all border rounded-xl bg-white/5 border-white/10 hover:bg-white/10">
          <svg
            className="w-5 h-5 text-slate-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
            />
          </svg>

          <span className="absolute w-2.5 h-2.5 bg-rose-500 rounded-full top-2 right-2 animate-pulse"></span>
        </button>

        {/* User */}
        <div className="items-center hidden gap-3 px-3 py-2 border sm:flex rounded-2xl bg-white/5 border-white/10 backdrop-blur-xl">

          <div className="flex items-center justify-center w-10 h-10 text-sm font-bold text-white shadow-lg rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">
              {userName}
            </p>

            <p className="text-[11px] text-slate-400">
              Administrator
            </p>
          </div>
        </div>

        {/* Logout */}
        <div className="ml-1">
          <LogoutButton />
        </div>
      </div>
    </div>
  </div>
</header>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === "dashboard" && (
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
                <h2 className="text-sm font-semibold">CUG Connections</h2>
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
      )}

      {/* ── BILLING TAB ── */}
      {activeTab === "billing" && (
        <main className="px-6 py-6 mx-auto max-w-screen-2xl">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Billing Management</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Manage CUG plan amounts, start & expiry dates. Billing date: <strong>5th of each month</strong>.
                Expiry alerts sent 4 → 3 → 2 → 1 day before.
              </p>
            </div>
          </div>
          <BillingTable data={connections} />
        </main>
      )}
    </div>
  );
}
