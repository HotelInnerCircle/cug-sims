import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { sendConsolidatedBillingEmail, getCompanyEmails, BillingConnection } from '@/lib/email'
import { getDaysRemaining } from '@/lib/utils'

// Warning window: send emails when daysRemaining is within this many days (or expired).
const WARNING_DAYS = 4

// Sends test emails PER COMPANY — only for connections that are expiring or expired.
// Active connections (> WARNING_DAYS remaining) are excluded, exactly like the live cron.
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const raw = await ConnectionModel.find({}).lean()

  // Group by company — only include connections that are expiring/expired
  const byCompany: Record<string, BillingConnection[]> = {}

  for (const c of raw) {
    const company   = (c.company as string) || 'SAZ'
    const expiryIso = c.plan_expiry_date ? new Date(c.plan_expiry_date as Date).toISOString() : null
    const days      = getDaysRemaining(expiryIso)

    // Skip active connections — only include expiring (≤ WARNING_DAYS) or expired (< 0)
    if (days === null || days > WARNING_DAYS) continue

    const conn: BillingConnection = {
      name:             c.name as string,
      mobile:           c.mobile as string,
      company,
      billing_amount:   (c.billing_amount as number | null) ?? 0,
      plan_start_date:  c.plan_start_date  ? new Date(c.plan_start_date  as Date).toISOString() : null,
      plan_expiry_date: expiryIso,
      daysRemaining:    days,
      billing_status:   days <= 0 ? 'expired' : 'expiring_soon',
    }

    if (!byCompany[company]) byCompany[company] = []
    byCompany[company].push(conn)
  }

  const companies = Object.keys(byCompany)

  if (companies.length === 0) {
    return NextResponse.json({
      success: true,
      emails_sent: [],
      message: `No connections are expiring within ${WARNING_DAYS} days. Nothing to send.`,
      connections: 0,
      total_amount: 0,
    })
  }

  const emailsSent: string[] = []
  const errors: string[] = []
  let totalConnections = 0
  let totalAmount = 0

  for (const company of companies) {
    const conns    = byCompany[company]
    const toEmails = getCompanyEmails(company)

    // Sort soonest-expiring first; use the earliest expiry as the email reference date
    conns.sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
    const sampleExpiry  = conns[0].plan_expiry_date ?? new Date().toISOString()
    const daysRemaining = conns[0].daysRemaining ?? 0
    const isExpired     = daysRemaining <= 0

    const compTotal   = conns.reduce((s, c) => s + (c.billing_amount ?? 0), 0)
    totalConnections += conns.length
    totalAmount      += compTotal

    const dayText = isExpired ? 'EXPIRED' : `${daysRemaining} Day${daysRemaining === 1 ? '' : 's'} Left`
    const subject = isExpired
      ? `🔴 [${company}] ${conns.length} CUG Plans EXPIRED — Immediate Renewal Required`
      : `⚠️ [${company}] ${conns.length} CUG Plans Expiring in ${dayText} — Action Required`

    try {
      await sendConsolidatedBillingEmail({
        connections: conns,
        daysRemaining,
        expiryDate: sampleExpiry,
        subject,
        toEmails,
        isExpired,
      })
      emailsSent.push(`${company} → ${toEmails.join(', ')} (${conns.length} plans, ${dayText})`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${company}: ${msg}`)
    }
  }

  if (errors.length > 0 && emailsSent.length === 0) {
    return NextResponse.json({ success: false, error: errors.join('; ') }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    emails_sent: emailsSent,
    errors:      errors.length > 0 ? errors : undefined,
    connections: totalConnections,
    total_amount: totalAmount,
  })
}
