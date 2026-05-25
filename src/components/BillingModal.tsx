'use client'

import { useState } from 'react'
import { Connection, getNextBillingDate } from '@/lib/utils'

interface BillingModalProps {
  connection: Connection
  onClose: () => void
  onSave: (id: string, data: { billing_amount: number; plan_start_date: string; plan_expiry_date: string }) => void
}

function toDateInput(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().split('T')[0]
}

export function BillingModal({ connection, onClose, onSave }: BillingModalProps) {
  const nextBilling = getNextBillingDate()
  const defaultExpiry = nextBilling.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState(String(connection.billing_amount ?? ''))
  const [startDate, setStartDate] = useState(toDateInput(connection.plan_start_date) || todayStr)
  const [expiryDate, setExpiryDate] = useState(toDateInput(connection.plan_expiry_date) || defaultExpiry)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid plan amount.')
      return
    }
    if (!expiryDate) {
      setError('Please select a plan expiry date.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/connections/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: connection._id,
          billing_amount: Number(amount),
          plan_start_date: startDate,
          plan_expiry_date: expiryDate,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      onSave(connection._id!, {
        billing_amount: Number(amount),
        plan_start_date: startDate,
        plan_expiry_date: expiryDate,
      })
    } catch {
      setError('Failed to save billing info. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-base">Update Billing Info</h2>
            <p className="text-indigo-200 text-xs mt-0.5">{connection.name} · {connection.mobile}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Plan Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Plan Amount (₹/month)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="399"
                className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          {/* Plan Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Plan Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Plan Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              Plan Expiry Date
              <span className="ml-2 text-slate-400 text-[11px] normal-case font-normal">(Billing date: 5th of each month)</span>
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <p className="mt-1 text-xs text-slate-400">
              Next auto-suggested: {defaultExpiry}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save Billing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
