import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { sendConsolidatedBillingEmail, BillingConnection } from '@/lib/email'
import { getDaysRemaining } from '@/lib/utils'

// Sends a real consolidated test email with all DB connections.
// Shows each plan, total amount, and expiry status.
export async function GET(req: NextRequest) {
  const secret = new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()
  const raw = await ConnectionModel.find({}).lean()

  const connections: BillingConnection[] = raw.map((c) => {
    const expiryIso = c.plan_expiry_date ? new Date(c.plan_expiry_date as Date).toISOString() : null
    return {
      name: c.name as string,
      mobile: c.mobile as string,
      company: c.company as string,
      billing_amount: (c.billing_amount as number) ?? 399,
      plan_start_date: c.plan_start_date ? new Date(c.plan_start_date as Date).toISOString() : null,
      plan_expiry_date: expiryIso,
      daysRemaining: getDaysRemaining(expiryIso),
      billing_status: (c.billing_status as string) ?? 'active',
    }
  })

  const totalAmount = connections.reduce((s, c) => s + (c.billing_amount ?? 0), 0)

  // Use the first connection's expiry date (all should be the same after seeding)
  const sampleExpiry = connections.find((c) => c.plan_expiry_date)?.plan_expiry_date
  const expiryDate = sampleExpiry ?? new Date(Date.now() + 3 * 86400000).toISOString()
  const daysRemaining = getDaysRemaining(expiryDate) ?? 3

  try {
    await sendConsolidatedBillingEmail({
      connections,
      daysRemaining,
      expiryDate,
      subject: `📋 CUG Monthly Billing Report — ${connections.length} Plans · Total ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(totalAmount)}/month`,
    })

    return NextResponse.json({
      success: true,
      sent_to: 'hotelinnercircle12@gmail.com',
      connections: connections.length,
      total_amount: totalAmount,
      expiry_date: expiryDate,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
