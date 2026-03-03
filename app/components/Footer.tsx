import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-6 flex items-center justify-between text-xs text-zinc-500">
        <span>&copy; {new Date().getFullYear()} Cognia ehf.</span>
        <div className="flex gap-4">
          <Link href="/skilmalar" className="hover:text-zinc-300 transition">
            Skilmálar
          </Link>
          <Link href="/personuvernd" className="hover:text-zinc-300 transition">
            Persónuvernd
          </Link>
        </div>
      </div>
    </footer>
  )
}
