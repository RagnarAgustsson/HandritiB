import { redirect } from '@/i18n/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getAdminStatus } from '@/lib/auth/admin-check'
import AdminClient from './AdminClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AdminPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { isAdmin } = await getAdminStatus()
  if (!isAdmin) redirect({ href: '/', locale })

  return <AdminClient />
}
