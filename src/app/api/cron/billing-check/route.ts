import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { sendConsolidatedBillingEmail, getCompanyEmails, BillingConnection } from '@/lib/email'

// Runs daily (via Vercel cron or manual trigger).
// Sends ONE consolidated email PER COMPANY per event (expired or expiring).
// Auto-renews expired plans to next month's 5th.
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const cycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const allConnections = await ConnectionModel.find({ plan_expiry_date: { $ne: null } }).lean()

  // Per-company buckets: expired and expiring (by days)
  const expiredByCompany: Record<string, BillingConnection[]> = {}
  const expiringByCompany: Record<number, Record<string, BillingConnection[]>> = {
    1: {}, 2: {}, 3: {}, 4: {},
  }
  const autoRenewed: string[] = []
  const emailsSent: string[] = []

  for (const conn of allConnections) {
    const expiry = new Date(conn.plan_expiry_date as Date)
    expiry.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const emailLog: Array<{ days_remaining: number; cycle: string }> = (conn.billing_email_log as Array<{ days_remaining: number; cycle: string }>) ?? []
    const company = (conn.company as string) || 'SAZ'

    const billingConn: BillingConnection = {
      name: conn.name as string,
      mobile: conn.mobile as string,
      company,
      billing_amount: (conn.billing_amount as number) ?? 399,
      plan_start_date: conn.plan_start_date ? new Date(conn.plan_start_date as Date).toISOString() : null,
      plan_expiry_date: conn.plan_expiry_date ? new Date(conn.plan_expiry_date as Date).toISOString() : null,
      daysRemaining,
    }

    if (daysRemaining < 0) {
      // Auto-renew: advance start and expiry by exactly one month, preserving the original cycle day.
      // e.g. expiry was May 31 → new expiry = June 30 (clamped to last day of month)
      //      expiry was June 10 → new expiry = July 10
      const newStart = new Date(expiry)
      newStart.setMonth(newStart.getMonth() + 1)

      const origExpiryDay = expiry.getDate()
      const newExpiry = new Date(expiry)
      newExpiry.setMonth(newExpiry.getMonth() + 1)
      // Clamp: if the original day doesn't exist in next month (e.g. Jan 31 → Feb 31), JS
      // would overflow to March. Instead, pin to the last day of next month.
      const nextMonthLastDay = new Date(newExpiry.getFullYear(), newExpiry.getMonth() + 1, 0).getDate()
      if (origExpiryDay > nextMonthLastDay) {
        newExpiry.setDate(nextMonthLastDay)
      }

      await ConnectionModel.updateOne(
        { _id: conn._id },
        {
          $set: {
            plan_start_date: newStart,
            plan_expiry_date: newExpiry,
            billing_status: 'active',
            billing_email_log: [],
          },
        }
      )
      autoRenewed.push(conn.mobile as string)

      const alreadySentExpired = emailLog.some((e) => e.days_remaining === 0 && e.cycle === cycle)
      if (!alreadySentExpired) {
        if (!expiredByCompany[company]) expiredByCompany[company] = []
        expiredByCompany[company].push({ ...billingConn, billing_status: 'expired' })
      }
    } else if (daysRemaining >= 1 && daysRemaining <= 4) {
      const alreadySent = emailLog.some((e) => e.days_remaining === daysRemaining && e.cycle === cycle)
      if (!alreadySent) {
        if (!expiringByCompany[daysRemaining][company]) expiringByCompany[daysRemaining][company] = []
        expiringByCompany[daysRemaining][company].push({ ...billingConn, billing_status: 'expiring_soon' })

        await ConnectionModel.updateOne(
          { _id: conn._id },
          {
            $set: { billing_status: 'expiring_soon' },
            $push: {
              billing_email_log: { days_remaining: daysRemaining, sent_at: new Date(), cycle },
            },
          }
        )
      }
    }
  }

  // Send ONE expired email PER COMPANY
  for (const [company, conns] of Object.entries(expiredByCompany)) {
    if (conns.length === 0) continue
    const expiry = conns[0].plan_expiry_date ?? new Date().toISOString()
    const toEmails = getCompanyEmails(company)
    try {
      await sendConsolidatedBillingEmail({
        connections: conns,
        daysRemaining: 0,
        expiryDate: expiry,
        subject: `🔴 [${company}] ${conns.length} CUG Plans EXPIRED — Immediate Renewal Required`,
        toEmails,
        isExpired: true,
      })
      emailsSent.push(`${company}-expired-${conns.length}`)
      for (const c of conns) {
        await ConnectionModel.updateOne(
          { mobile: c.mobile },
          { $push: { billing_email_log: { days_remaining: 0, sent_at: new Date(), cycle } } }
        )
      }
    } catch (err) {
      emailsSent.push(`${company}-expired-email-failed: ${String(err)}`)
    }
  }

  // Send ONE warning email PER COMPANY PER DAY group
  for (const days of [4, 3, 2, 1] as const) {
    for (const [company, conns] of Object.entries(expiringByCompany[days])) {
      if (conns.length === 0) continue
      const expiry = conns[0].plan_expiry_date ?? new Date().toISOString()
      const dayText = `${days} Day${days === 1 ? '' : 's'}`
      const toEmails = getCompanyEmails(company)
      try {
        await sendConsolidatedBillingEmail({
          connections: conns,
          daysRemaining: days,
          expiryDate: expiry,
          subject: `⚠️ [${company}] ${conns.length} CUG Plans Expiring in ${dayText} — Action Required`,
          toEmails,
        })
        emailsSent.push(`${company}-warning-${days}d-${conns.length}`)
      } catch (err) {
        emailsSent.push(`${company}-warning-${days}d-email-failed: ${String(err)}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    checked: allConnections.length,
    autoRenewed: autoRenewed.length,
    emailsSent,
  })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
