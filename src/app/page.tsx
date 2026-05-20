import { Dashboard } from '@/components/Dashboard'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import type { Connection } from '@/lib/utils'

export default async function Home() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')?.value
  let userName = 'Admin'

  if (token) {
    const user = await verifyToken(token)
    if (user) userName = user.name
  }

  await connectDB()
  const raw = await ConnectionModel.find({}).lean()

  const connections: Connection[] = raw.map((c: Record<string, unknown>) => ({
    _id: String(c._id),
    company: c.company as Connection['company'],
    mobile: String(c.mobile || ''),
    name: String(c.name || ''),
    designation: String(c.designation || ''),
    department: String(c.department || ''),
    network: String(c.network || ''),
    plan_type: String(c.plan_type || ''),
    paid_by: String(c.paid_by || ''),
    location: String(c.location || ''),
    fancy_tier: (c.fancy_tier as Connection['fancy_tier']) ?? null,
    remark: {
      assignedTo: String((c.remark as Record<string, unknown>)?.assignedTo || ''),
      note: String((c.remark as Record<string, unknown>)?.note || ''),
    },
  }))

  return <Dashboard connections={connections} userName={userName} />
}
