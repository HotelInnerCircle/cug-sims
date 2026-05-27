import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getFancyTier } from '@/lib/utils'

// Admin-only: wipes all connections and seeds fresh data.
// POST body: { connections: RawConnection[], plan_start_date?, plan_expiry_date? }
//
// Each RawConnection needs: mobile, name, company (SAZ|RKS|HIC|BAC),
// and optionally: designation, department, network, plan_type, paid_by,
// location, billing_amount, plan_start_date, plan_expiry_date
export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  if (!token || !(await verifyToken(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body || !Array.isArray(body.connections)) {
    return NextResponse.json(
      { error: 'Body must be { connections: [...], plan_start_date?, plan_expiry_date? }' },
      { status: 400 }
    )
  }

  // Default plan dates (5th of current month → 5th of next month)
  const defaultStart = body.plan_start_date ? new Date(body.plan_start_date) : new Date('2026-06-05')
  const defaultExpiry = body.plan_expiry_date ? new Date(body.plan_expiry_date) : new Date('2026-07-05')
  const defaultAmount = Number(body.billing_amount) || 399

  await connectDB()

  // Wipe all existing connections
  await ConnectionModel.deleteMany({})

  // Build documents
  const docs = (body.connections as Record<string, unknown>[]).map((row) => {
    const mobile = String(row.mobile ?? '').trim()
    const planStart = row.plan_start_date ? new Date(row.plan_start_date as string) : defaultStart
    const planExpiry = row.plan_expiry_date ? new Date(row.plan_expiry_date as string) : defaultExpiry
    const amount = row.billing_amount !== undefined ? Number(row.billing_amount) : defaultAmount

    return {
      mobile,
      name: String(row.name ?? '').trim(),
      company: String(row.company ?? 'SAZ').trim(),
      designation: String(row.designation ?? '').trim(),
      department: String(row.department ?? '').trim(),
      network: String(row.network ?? '').trim(),
      plan_type: String(row.plan_type ?? 'POST PAID').trim(),
      paid_by: String(row.paid_by ?? '').trim(),
      location: String(row.location ?? '').trim(),
      fancy_tier: getFancyTier(mobile),
      billing_amount: amount,
      plan_start_date: planStart,
      plan_expiry_date: planExpiry,
      billing_status: 'active',
      billing_email_log: [],
      remark: { assignedTo: '', note: '', updatedAt: null, updatedBy: '' },
    }
  })

  const result = await ConnectionModel.insertMany(docs, { ordered: false })

  return NextResponse.json({
    success: true,
    deleted: 'all previous records',
    inserted: result.length,
    plan_start_date: defaultStart,
    plan_expiry_date: defaultExpiry,
  })
}
