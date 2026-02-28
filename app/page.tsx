import Link from 'next/link'
import { Mic, Upload, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-100 mb-3">Handriti</h1>
        <p className="text-lg text-zinc-400 mb-12">Hljóðritar og tekur saman á íslensku</p>

        <div className="grid gap-3">
          <Link
            href="/taka-upp"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
              <Mic className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">Taka upp</div>
              <div className="text-sm text-zinc-400">Hljóðrita í beinni og fáðu glósur samstundis</div>
            </div>
          </Link>

          <Link
            href="/hlada-upp"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Upload className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">Hlaða upp skrá</div>
              <div className="text-sm text-zinc-400">Sendu hljóðskrá og fáðu alla samantekt</div>
            </div>
          </Link>

          <Link
            href="/beinlina"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Zap className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">Beinlína</div>
              <div className="text-sm text-zinc-400">Talaðu beint við AI með GPT Realtime</div>
            </div>
          </Link>
        </div>

        <Link
          href="/lotur"
          className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          Skoða fyrri lotur →
        </Link>
      </div>
    </main>
  )
}
