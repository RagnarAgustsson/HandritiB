import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default function Nav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <Link href="/" className="font-bold text-zinc-100 tracking-tight">Handriti</Link>
        <div className="flex items-center gap-4">
          <Link href="/lotur" className="text-sm text-zinc-400 hover:text-zinc-100 transition">Lotur</Link>
          <UserButton afterSignOutUrl="/innskraning" />
        </div>
      </div>
    </nav>
  )
}
