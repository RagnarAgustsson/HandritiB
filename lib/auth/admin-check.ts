import { currentUser } from '@clerk/nextjs/server'
import { isAdmin, bootstrapAdmin } from '@/lib/db/admin'

export async function getAdminStatus() {
  const user = await currentUser()
  if (!user) return { userId: null, email: null, isAdmin: false }

  const email = user.emailAddresses[0]?.emailAddress || ''
  const admin = await bootstrapAdmin(user.id, email)

  return { userId: user.id, email, isAdmin: admin }
}
