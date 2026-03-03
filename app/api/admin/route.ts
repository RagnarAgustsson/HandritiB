import { currentUser, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdmin, addAdmin, removeAdmin, getAuditLog, getAuditLogCount, getAllAdmins, logAction } from '@/lib/db/admin'
import { getAllSubscriptions } from '@/lib/db/subscriptions'
import { getAllFreeAccessGrants, grantFreeAccess, revokeFreeAccess } from '@/lib/db/free-access'
import { getContactMessages } from '@/lib/db/contacts'
import { getActiveSessions, closeSession } from '@/lib/db/sessions'

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

  const clerk = await clerkClient()

  const [log, total, clerkUsers, adminList, subs, freeGrants, messages, activeSessions] = await Promise.all([
    getAuditLog(limit, offset),
    getAuditLogCount(),
    clerk.users.getUserList({ limit: 100, orderBy: '-created_at' }),
    getAllAdmins(),
    getAllSubscriptions(),
    getAllFreeAccessGrants(),
    getContactMessages(),
    getActiveSessions(),
  ])

  const adminIds = new Set(adminList.map(a => a.userId))
  const subMap = new Map(subs.map(s => [s.userId, s]))
  const freeMap = new Map(freeGrants.map(g => [g.userId, g]))

  const users = clerkUsers.data.map(u => ({
    userId: u.id,
    email: u.emailAddresses[0]?.emailAddress || '',
    lastSeen: u.lastSignInAt ? new Date(u.lastSignInAt).toISOString() : new Date(u.createdAt).toISOString(),
    isAdmin: adminIds.has(u.id),
    subscription: subMap.get(u.id) ? {
      status: subMap.get(u.id)!.status,
      minutesLimit: subMap.get(u.id)!.minutesLimit,
    } : null,
    hasFreeAccess: freeMap.has(u.id),
  }))

  // Map active sessions to include user email from Clerk
  const clerkMap = new Map(clerkUsers.data.map(u => [u.id, u.emailAddresses[0]?.emailAddress || '']))
  const activeSessionsWithEmail = activeSessions.map(s => ({
    ...s,
    email: clerkMap.get(s.userId) || s.userId,
  }))

  return NextResponse.json({ log, total, users, page, pages: Math.ceil(total / limit), messages, activeSessions: activeSessionsWithEmail })
}

export async function POST(request: NextRequest) {
  const result = await requireAdmin()
  if ('error' in result) return result.error

  const { targetUserId, targetEmail, action } = await request.json()

  if (action === 'search') {
    // Search for a Clerk user by email
    const clerk = await clerkClient()
    const found = await clerk.users.getUserList({ emailAddress: [targetEmail], limit: 1 })
    if (found.data.length === 0) {
      return NextResponse.json({ villa: 'Notandi finnst ekki' }, { status: 404 })
    }
    const u = found.data[0]
    const admin = await isAdmin(u.id)
    return NextResponse.json({
      user: { userId: u.id, email: u.emailAddresses[0]?.emailAddress || targetEmail, isAdmin: admin },
    })
  } else if (action === 'add') {
    await addAdmin(targetUserId, targetEmail)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Gerði ${targetEmail} að stjórnanda`)
  } else if (action === 'remove') {
    if (targetUserId === result.userId) {
      return NextResponse.json({ villa: 'Getur ekki fjarlægt sjálfan þig' }, { status: 400 })
    }
    await removeAdmin(targetUserId)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Fjarlægði ${targetEmail} sem stjórnanda`)
  } else if (action === 'grant-free') {
    await grantFreeAccess(targetUserId, result.userId, `Veitt af ${result.email}`)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Veitti ${targetEmail} frítt aðgangsleyfi`)
  } else if (action === 'revoke-free') {
    await revokeFreeAccess(targetUserId)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Afturkallaði frítt aðgangsleyfi ${targetEmail}`)
  } else if (action === 'close-session') {
    const sessionId = typeof targetUserId === 'string' ? targetUserId : ''
    if (!sessionId) return NextResponse.json({ villa: 'Lotu-ID vantar' }, { status: 400 })
    await closeSession(sessionId)
    await logAction(result.userId, result.email, 'admin.uppfaera', `Lokaði lotu ${sessionId}`)
  }

  return NextResponse.json({ ok: true })
}
