import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { getAdminStatus } from '@/lib/auth/admin-check'
import Logo from './Logo'

export default async function Nav() {
  const { isAdmin } = await getAdminStatus()

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-zinc-100 tracking-tight">
          <Logo size={28} />
          Handriti
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/lotur" className="text-sm text-zinc-400 hover:text-zinc-100 transition">Lotur</Link>
          <Link href="/askrift" className="text-sm text-zinc-400 hover:text-zinc-100 transition">Áskrift</Link>
          {isAdmin && (
            <Link href="/admin" className="text-sm text-indigo-400 hover:text-indigo-300 transition">Stjórnborð</Link>
          )}
          <UserButton afterSignOutUrl="/innskraning" />
        </div>
      </div>
    </nav>
  )
}
