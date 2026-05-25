import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

// Sets ₹399 billing + May 5 → June 5 dates for every connection.
// Admin-only. Call once to seed billing data.
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const billing_amount = Number(body.billing_amount) || 399
  const plan_start_date = body.plan_start_date ? new Date(body.plan_start_date) : new Date('2026-05-05')
  const plan_expiry_date = body.plan_expiry_date ? new Date(body.plan_expiry_date) : new Date('2026-06-05')

  await connectDB()

  const result = await ConnectionModel.updateMany(
    {},
    {
      $set: {
        billing_amount,
        plan_start_date,
        plan_expiry_date,
        billing_status: 'active',
        billing_email_log: [],
      },
    }
  )

  return NextResponse.json({
    success: true,
    updated: result.modifiedCount,
    billing_amount,
    plan_start_date,
    plan_expiry_date,
  })
}
