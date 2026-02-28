import { currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, addAdmin, removeAdmin, getAuditLog, getAuditLogCount, getUniqueUsers, logAction } from '@/lib/db/admin'

async function requireAdmin() {
  const user = await currentUser()
  if (!user) return { error: NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 }) }

  const email = user.emailAddresses[0]?.emailAddress || ''
  const admin = await isAdmin(user.id)
  if (!admin) return { error: NextResponse.json({ villa: 'Ekki stjórnandi' }, { status: 403 }) }

  return { user, email, userId: user.id }
}

export async function GET(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const page = parseInt(request.nextUrl.searchParams.get('page') || '1')
  const limit = 50
  const offset = (page - 1) * limit

  const [log, total, users] = await Promise.all([
    getAuditLog(limit, offset),
    getAuditLogCount(),
    getUniqueUsers(),
  ])

  return NextResponse.json({ log, total, users, page, pages: Math.ceil(total / limit) })
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { targetUserId, targetEmail, action } = await request.json()

  if (action === 'add') {
    await addAdmin(targetUserId, targetEmail)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Gerði ${targetEmail} að stjórnanda`)
  } else if (action === 'remove') {
    if (targetUserId === result.userId) {
      return NextResponse.json({ villa: 'Getur ekki fjarlægt sjálfan þig' }, { status: 400 })
    }
    await removeAdmin(targetUserId)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Fjarlægði ${targetEmail} sem stjórnanda`)
  }

  return NextResponse.json({ ok: true })
}
