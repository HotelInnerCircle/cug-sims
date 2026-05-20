import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { User } from '@/models/User'
import rawData from '@/data/connections.json'
import { getFancyTier } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (process.env.NODE_ENV === 'production' && secret !== process.env.SEED_SECRET) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await connectDB()

    // Seed connections if DB is empty
    let connectionsSeeded = 0
    const count = await ConnectionModel.countDocuments()

    if (count === 0) {
      const docs = (rawData as Record<string, unknown>[]).map((r) => ({
        company: r.company,
        mobile: String(r.mobile),
        name: String(r.name || ''),
        designation: String(r.designation || ''),
        department: String(r.department || ''),
        network: String(r.network || ''),
        plan_type: String(r.plan_type || ''),
        paid_by: String(r.paid_by || ''),
        location: String(r.location || ''),
        fancy_tier: getFancyTier(String(r.mobile)),
        remark: { assignedTo: '', note: '', updatedAt: null, updatedBy: '' },
      }))
      await ConnectionModel.insertMany(docs, { ordered: false })
      connectionsSeeded = docs.length
    }

    // Seed default admin
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@saboocug.com').toLowerCase()
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123'

    let userCreated = false
    const existing = await User.findOne({ email: adminEmail })

    if (!existing) {
      const hashed = await bcrypt.hash(adminPassword, 12)
      await User.create({ email: adminEmail, password: hashed, name: 'Admin' })
      userCreated = true
    }

    return NextResponse.json({
      success: true,
      connectionsSeeded,
      userCreated,
      message: userCreated
        ? `Admin created — email: ${adminEmail}  password: ${adminPassword}`
        : 'Admin already exists. No changes made.',
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[SEED ERROR]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
