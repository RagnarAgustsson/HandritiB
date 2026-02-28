import Link from 'next/link'
import { Mic, Upload, Zap } from 'lucide-react'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-3">Handriti</h1>
        <p className="text-lg text-gray-500 mb-12">Hljóðritar og tekur saman á íslensku</p>

        <div className="grid gap-4">
          <Link
            href="/taka-upp"
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-gray-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
              <Mic className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Taka upp</div>
              <div className="text-sm text-gray-500">Hljóðrita í beinni og fáðu glósur samstundis</div>
            </div>
          </Link>

          <Link
            href="/hlaða-upp"
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-gray-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50">
              <Upload className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Hlaða upp skrá</div>
              <div className="text-sm text-gray-500">Sendu hljóðskrá og fáðu alla samantekt</div>
            </div>
          </Link>

          <Link
            href="/beinlina"
            className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-gray-300"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Beinlína</div>
              <div className="text-sm text-gray-500">Talaðu beint við AI með GPT Realtime</div>
            </div>
          </Link>
        </div>

        <Link
          href="/lotur"
          className="mt-8 inline-block text-sm text-gray-400 hover:text-gray-600 transition"
        >
          Skoða fyrri lotur →
        </Link>
      </div>
    </main>
  )
}
