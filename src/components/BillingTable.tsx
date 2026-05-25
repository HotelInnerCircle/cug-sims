'use client'

import { useState, useMemo } from 'react'
import { Connection, getBillingStatusInfo, formatDate, companyColor, BillingStatus } from '@/lib/utils'
import { BillingModal } from '@/components/BillingModal'

interface BillingTableProps {
  data: Connection[]
}

const PER_PAGE = 20

function StatusBadge({ expiryDate }: { expiryDate: string | null | undefined }) {
  const info = getBillingStatusInfo(expiryDate)
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${info.colorClass}`}>
      {info.status === 'expired' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />}
      {info.status === 'expiring_soon' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />}
      {info.status === 'active' && info.daysRemaining !== null && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
      {info.label}
    </span>
  )
}

export function BillingTable({ data }: BillingTableProps) {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BillingStatus | ''>('')
  const [editingConn, setEditingConn] = useState<Connection | null>(null)
  const [billingOverrides, setBillingOverrides] = useState(
    new Map<string, { billing_amount: number; plan_start_date: string; plan_expiry_date: string }>()
  )
  const [runningCheck, setRunningCheck] = useState(false)
  const [checkResult, setCheckResult] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const filtered = useMemo(() => {
    return data.filter((c) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.mobile.includes(q) &&
          !c.company.toLowerCase().includes(q)
        )
          return false
      }
      if (statusFilter) {
        const override = c._id ? billingOverrides.get(c._id) : undefined
        const expiryDate = override?.plan_expiry_date ?? c.plan_expiry_date
        const info = getBillingStatusInfo(expiryDate)
        if (info.status !== statusFilter) return false
      }
      return true
    })
  }, [data, search, statusFilter, billingOverrides])

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1
  const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const summaryStats = useMemo(() => {
    let active = 0, expiring = 0, expired = 0, totalAmount = 0
    data.forEach((c) => {
      const override = c._id ? billingOverrides.get(c._id) : undefined
      const expiryDate = override?.plan_expiry_date ?? c.plan_expiry_date
      const amount = override?.billing_amount ?? c.billing_amount ?? 0
      const info = getBillingStatusInfo(expiryDate)
      if (info.status === 'active') active++
      else if (info.status === 'expiring_soon') expiring++
      else if (info.status === 'expired') expired++
      totalAmount += amount
    })
    return { active, expiring, expired, totalAmount }
  }, [data, billingOverrides])

  function handleBillingSave(
    id: string,
    newData: { billing_amount: number; plan_start_date: string; plan_expiry_date: string }
  ) {
    setBillingOverrides((prev) => new Map(prev).set(id, newData))
    setEditingConn(null)
  }

  function getEffectiveBilling(conn: Connection) {
    const override = conn._id ? billingOverrides.get(conn._id) : undefined
    return {
      billing_amount: override?.billing_amount ?? conn.billing_amount ?? 0,
      plan_start_date: override?.plan_start_date ?? conn.plan_start_date ?? null,
      plan_expiry_date: override?.plan_expiry_date ?? conn.plan_expiry_date ?? null,
    }
  }

  async function runBillingCheck() {
    setRunningCheck(true)
    setCheckResult(null)
    setTestResult(null)
    try {
      const res = await fetch(`/api/cron/billing-check?secret=saboo-cug-cron-secret-2026`)
      const json = await res.json()
      setCheckResult(`Checked ${json.checked ?? 0} connections. ${json.results?.length ?? 0} actions taken.`)
    } catch {
      setCheckResult('Failed to run billing check.')
    } finally {
      setRunningCheck(false)
    }
  }

  async function seedAllPlans() {
    setSeeding(true)
    setSeedResult(null)
    setTestResult(null)
    setCheckResult(null)
    try {
      const res = await fetch('/api/seed-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billing_amount: 399,
          plan_start_date: '2026-05-05',
          plan_expiry_date: '2026-06-05',
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSeedResult({ ok: true, msg: `✓ Set ₹399 + May 5→Jun 5 for ${json.updated} connections. Refresh to see.` })
      } else {
        setSeedResult({ ok: false, msg: json.error ?? 'Seed failed.' })
      }
    } catch {
      setSeedResult({ ok: false, msg: 'Request failed.' })
    } finally {
      setSeeding(false)
    }
  }

  async function sendTestEmail() {
    setSendingTest(true)
    setTestResult(null)
    setSeedResult(null)
    setCheckResult(null)
    try {
      const res = await fetch(`/api/test-email?secret=saboo-cug-cron-secret-2026`)
      const json = await res.json()
      if (json.success) {
        setTestResult({
          ok: true,
          msg: `✓ Email sent to hotelinnercircle12@gmail.com — ${json.connections} plans · ₹${Number(json.total_amount).toLocaleString('en-IN')}/mo total`,
        })
      } else {
        setTestResult({ ok: false, msg: json.error ?? 'Email failed.' })
      }
    } catch {
      setTestResult({ ok: false, msg: 'Request failed.' })
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Connections</p>
          <p className="text-2xl font-bold text-slate-800">{data.length}</p>
        </div>
        <div className="bg-white border border-emerald-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">Active Plans</p>
          <p className="text-2xl font-bold text-emerald-700">{summaryStats.active}</p>
        </div>
        <div className="bg-white border border-amber-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">Expiring Soon</p>
          <p className="text-2xl font-bold text-amber-700">{summaryStats.expiring}</p>
        </div>
        <div className="bg-white border border-red-200 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wider mb-1">Expired</p>
          <p className="text-2xl font-bold text-red-700">{summaryStats.expired}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search name, mobile, company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="filter-input w-52"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as BillingStatus | ''); setPage(1) }}
          className="filter-input"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="expiring_soon">Expiring Soon</option>
          <option value="expired">Expired</option>
        </select>

        <div className="flex-1" />

        {seedResult && (
          <span className={`text-xs px-3 py-1.5 rounded-lg border max-w-xs ${seedResult.ok ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {seedResult.msg}
          </span>
        )}
        {testResult && (
          <span className={`text-xs px-3 py-1.5 rounded-lg border max-w-xs ${testResult.ok ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
            {testResult.msg}
          </span>
        )}
        {checkResult && (
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            {checkResult}
          </span>
        )}
        <button
          onClick={seedAllPlans}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {seeding ? 'Setting…' : 'Set All ₹399'}
        </button>
        <button
          onClick={sendTestEmail}
          disabled={sendingTest}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {sendingTest ? 'Sending…' : 'Send Test Email'}
        </button>
        <button
          onClick={runBillingCheck}
          disabled={runningCheck}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <svg className={`w-4 h-4 ${runningCheck ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {runningCheck ? 'Checking…' : 'Run Billing Check'}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead className="sticky top-0 z-10 border-b bg-gradient-to-r from-slate-100 to-slate-50 border-slate-200">
              <tr>
                {['#', 'Name', 'Mobile', 'Company', 'Plan Amount', 'Start Date', 'Expiry Date', 'Status', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-4 text-left text-[11px] font-bold tracking-[0.15em] uppercase text-slate-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {slice.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-20 text-sm font-medium text-center text-slate-400">
                    No connections found
                  </td>
                </tr>
              ) : (
                slice.map((conn, i) => {
                  const billing = getEffectiveBilling(conn)
                  const rowNum = (page - 1) * PER_PAGE + i + 1

                  return (
                    <tr key={conn._id ?? conn.mobile} className="group transition-all duration-200 hover:bg-blue-50/60">
                      {/* # */}
                      <td className="px-5 py-4 text-slate-400 text-xs font-mono">{rowNum}</td>

                      {/* Name */}
                      <td className="px-5 py-4">
                        <p className="max-w-[160px] truncate font-semibold text-slate-800" title={conn.name}>
                          {conn.name || '—'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{conn.designation || ''}</p>
                      </td>

                      {/* Mobile */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-100">
                          <span className="font-mono text-xs font-semibold text-slate-700 tracking-wider">
                            {conn.mobile}
                          </span>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${companyColor(conn.company)}`}>
                          {conn.company}
                        </span>
                      </td>

                      {/* Plan Amount */}
                      <td className="px-5 py-4">
                        {billing.billing_amount > 0 ? (
                          <span className="font-bold text-slate-800">
                            ₹{billing.billing_amount.toLocaleString('en-IN')}
                            <span className="text-slate-400 font-normal text-xs">/mo</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">Not set</span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="text-slate-600 text-xs">{formatDate(billing.plan_start_date)}</span>
                      </td>

                      {/* Expiry Date */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {billing.plan_expiry_date ? (
                          <div>
                            <span className="text-slate-800 text-xs font-semibold">{formatDate(billing.plan_expiry_date)}</span>
                            <p className="text-slate-400 text-[11px] mt-0.5">Billing: 5th of month</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Not set</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <StatusBadge expiryDate={billing.plan_expiry_date} />
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setEditingConn(conn)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-all shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" />
                          </svg>
                          Edit
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-4 px-6 py-4 border-t border-slate-200 bg-slate-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-slate-600">
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-slate-900">{filtered.length}</span> connections
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium transition bg-white border shadow-sm rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <div className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 shadow rounded-xl">
              {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm font-medium transition bg-white border shadow-sm rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Billing Edit Modal */}
      {editingConn && (
        <BillingModal
          connection={{
            ...editingConn,
            ...(editingConn._id && billingOverrides.has(editingConn._id)
              ? billingOverrides.get(editingConn._id)
              : {}),
          }}
          onClose={() => setEditingConn(null)}
          onSave={handleBillingSave}
        />
      )}
    </div>
  )
}
