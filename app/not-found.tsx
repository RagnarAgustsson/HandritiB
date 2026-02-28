import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-zinc-800 mb-4">404</h1>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">Síða finnst ekki</h2>
      <p className="text-zinc-500 mb-8">Við fundum ekki síðuna sem þú baðst um.</p>
      <Link href="/" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 transition">
        Fara á forsíðu
      </Link>
    </div>
  )
}
