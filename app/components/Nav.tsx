import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

export default function Nav() {
  return (
    <nav className="border-b border-gray-100 bg-white px-4 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <Link href="/" className="font-bold text-gray-900 tracking-tight">Handriti</Link>
        <div className="flex items-center gap-4">
          <Link href="/lotur" className="text-sm text-gray-500 hover:text-gray-900 transition">Lotur</Link>
          <UserButton afterSignOutUrl="/innskraning" />
        </div>
      </div>
    </nav>
  )
}
