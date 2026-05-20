export type FancyTier = 1 | 2 | 3 | null;

export interface Remark {
  assignedTo: string;
  note: string;
}

export interface Connection {
  _id?: string;
  company: "HIC" | "RKS" | "SAZ";
  mobile: string;
  name: string;
  designation: string;
  department: string;
  network: string;
  plan_type: string;
  paid_by: string;
  location: string;
  fancy_tier: FancyTier | "";
  remark?: Remark;
}

export interface Filters {
  search: string;
  company: string;
  network: string;
  plan: string;
  tier: FancyTier | null;
}

export function getFancyTier(num: string): FancyTier {
  const s = num.trim();
  if (s.length !== 10 || !/^\d{10}$/.test(s)) return null;

  // Tier 1: all same, palindrome, pure arithmetic sequence, 4+ same tail
  if (new Set(s.split("")).size === 1) return 1;
  if (s === s.split("").reverse().join("")) return 1;
  const diffs = Array.from({ length: s.length - 1 }, (_, i) => +s[i + 1] - +s[i]);
  if (new Set(diffs).size === 1) return 1;
  if (new Set(s.slice(-4).split("")).size === 1) return 1;

  // Tier 2: 3-same tail, 3+ matching pairs
  if (new Set(s.slice(-3).split("")).size === 1) return 2;
  const pairs = Array.from({ length: Math.floor(s.length / 2) }, (_, i) => s[i * 2] === s[i * 2 + 1]);
  if (pairs.filter(Boolean).length >= 3) return 2;

  // Tier 3: double ending, mirrored adjacent pairs
  const endings = ["00","11","22","33","44","55","66","77","88","99"];
  if (endings.includes(s.slice(-2))) return 3;
  if (s.slice(0, 2) === s.slice(2, 4)) return 3;
  if (s.slice(4, 6) === s.slice(6, 8)) return 3;

  return null;
}

export function networkColor(n: string) {
  const k = (n || "").toLowerCase();
  if (k === "airtel") return "bg-rose-950 text-rose-300 border-rose-800";
  if (k === "vodafone") return "bg-purple-950 text-purple-300 border-purple-800";
  if (k === "jio") return "bg-blue-950 text-blue-300 border-blue-800";
  if (k === "vi" || k === "vi ") return "bg-violet-950 text-violet-300 border-violet-800";
  return "bg-slate-800 text-slate-400 border-slate-700";
}

export function planColor(p: string) {
  if ((p || "").toLowerCase().includes("post")) return "bg-emerald-950 text-emerald-300 border-emerald-800";
  if ((p || "").toLowerCase().includes("pre")) return "bg-amber-950 text-amber-300 border-amber-800";
  return "bg-slate-800 text-slate-400 border-slate-700";
}

export function companyColor(c: string) {
  if (c === "HIC") return "text-sky-800 bg-sky-100 border-sky-300";
  if (c === "RKS") return "text-teal-800 bg-teal-100 border-teal-300";
  if (c === "SAZ") return "text-amber-800 bg-amber-100 border-amber-300";
  return "text-slate-600 bg-slate-100 border-slate-300";
}

export function tierMobileClass(t: FancyTier | "") {
  if (t === 1) return "text-violet-300 font-semibold";
  if (t === 2) return "text-emerald-300 font-semibold";
  if (t === 3) return "text-rose-300 font-semibold";
  return "text-slate-400";
}
