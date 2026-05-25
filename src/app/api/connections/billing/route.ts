import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function PUT(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { id, billing_amount, plan_start_date, plan_expiry_date } = body

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  await connectDB()

  // Recalculate billing_status based on new expiry date
  let billing_status = 'active'
  if (plan_expiry_date) {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const expiry = new Date(plan_expiry_date)
    expiry.setHours(0, 0, 0, 0)
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) billing_status = 'expired'
    else if (days <= 4) billing_status = 'expiring_soon'
    else billing_status = 'active'
  }

  const updated = await ConnectionModel.findByIdAndUpdate(
    id,
    {
      $set: {
        billing_amount: Number(billing_amount) || 0,
        plan_start_date: plan_start_date ? new Date(plan_start_date) : null,
        plan_expiry_date: plan_expiry_date ? new Date(plan_expiry_date) : null,
        billing_status,
        billing_email_log: [], // reset email log on manual renewal
      },
    },
    { new: true }
  )

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true, billing_status })
}
