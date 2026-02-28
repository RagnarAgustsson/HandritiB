import { redirect } from 'next/navigation'
import { getAdminStatus } from '@/lib/auth/admin-check'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const { isAdmin } = await getAdminStatus()
  if (!isAdmin) redirect('/')

  return <AdminClient />
}
