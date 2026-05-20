import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import { ConnectionModel } from '@/models/Connection'
import { getTokenFromRequest, verifyToken } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getTokenFromRequest(request)
  const user = token ? await verifyToken(token) : null

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const assignedTo = (body.assignedTo || '').trim()
  const note = (body.note || '').trim()

  await connectDB()

  const connection = await ConnectionModel.findByIdAndUpdate(
    params.id,
    {
      'remark.assignedTo': assignedTo,
      'remark.note': note,
      'remark.updatedAt': new Date(),
      'remark.updatedBy': user.name || user.email,
    },
    { new: true }
  )

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, remark: connection.remark })
}
