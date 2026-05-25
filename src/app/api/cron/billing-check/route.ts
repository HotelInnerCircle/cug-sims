import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { sendConsolidatedBillingEmail, BillingConnection } from '@/lib/email'

// Runs daily (via Vercel cron or manual trigger).
// Sends ONE consolidated email per event (not one per connection).
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

  const expiredConns: BillingConnection[] = []
  const expiringConns: Record<number, BillingConnection[]> = { 1: [], 2: [], 3: [], 4: [] }
  const autoRenewed: string[] = []
  const emailsSent: string[] = []

  for (const conn of allConnections) {
    const expiry = new Date(conn.plan_expiry_date as Date)
    expiry.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const emailLog: Array<{ days_remaining: number; cycle: string }> = (conn.billing_email_log as Array<{ days_remaining: number; cycle: string }>) ?? []

    const billingConn: BillingConnection = {
      name: conn.name as string,
      mobile: conn.mobile as string,
      company: conn.company as string,
      billing_amount: (conn.billing_amount as number) ?? 399,
      plan_start_date: conn.plan_start_date ? new Date(conn.plan_start_date as Date).toISOString() : null,
      plan_expiry_date: conn.plan_expiry_date ? new Date(conn.plan_expiry_date as Date).toISOString() : null,
      daysRemaining,
    }

    if (daysRemaining < 0) {
      // Auto-renew: push expiry to next month's 5th from the original expiry
      const newExpiry = new Date(expiry)
      newExpiry.setMonth(newExpiry.getMonth() + 1, 5)
      const newStart = new Date(expiry)

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

      // Only add to expired list if expired-email not yet sent this cycle
      const alreadySentExpired = emailLog.some((e) => e.days_remaining === 0 && e.cycle === cycle)
      if (!alreadySentExpired) {
        expiredConns.push({ ...billingConn, billing_status: 'expired' })
      }
    } else if (daysRemaining >= 1 && daysRemaining <= 4) {
      // Warning window: only add if this day's email not yet sent
      const alreadySent = emailLog.some((e) => e.days_remaining === daysRemaining && e.cycle === cycle)
      if (!alreadySent) {
        expiringConns[daysRemaining].push({ ...billingConn, billing_status: 'expiring_soon' })
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

  // Send ONE consolidated expired email
  if (expiredConns.length > 0) {
    const expiry = expiredConns[0].plan_expiry_date ?? new Date().toISOString()
    try {
      await sendConsolidatedBillingEmail({
        connections: expiredConns,
        daysRemaining: 0,
        expiryDate: expiry,
        subject: `🔴 ${expiredConns.length} CUG Plans EXPIRED — Immediate Renewal Required`,
        isExpired: true,
      })
      emailsSent.push(`expired-consolidated-${expiredConns.length}-connections`)
      // Mark expired email sent in log
      for (const c of expiredConns) {
        await ConnectionModel.updateOne(
          { mobile: c.mobile },
          { $push: { billing_email_log: { days_remaining: 0, sent_at: new Date(), cycle } } }
        )
      }
    } catch (err) {
      emailsSent.push(`expired-email-failed: ${String(err)}`)
    }
  }

  // Send ONE consolidated warning email per day group (4 days, 3 days, etc.)
  for (const days of [4, 3, 2, 1] as const) {
    const group = expiringConns[days]
    if (group.length > 0) {
      const expiry = group[0].plan_expiry_date ?? new Date().toISOString()
      const dayText = `${days} Day${days === 1 ? '' : 's'}`
      try {
        await sendConsolidatedBillingEmail({
          connections: group,
          daysRemaining: days,
          expiryDate: expiry,
          subject: `⚠️ ${group.length} CUG Plans Expiring in ${dayText} — Action Required`,
        })
        emailsSent.push(`warning-${days}d-consolidated-${group.length}-connections`)
      } catch (err) {
        emailsSent.push(`warning-${days}d-email-failed: ${String(err)}`)
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
