import { Check } from 'lucide-react'

export const metadata = {
  title: 'Verðskrá — Handriti',
  description: 'Áskriftarleiðir Handriti',
}

const features = {
  trial: [
    'Hljóðritun á íslensku',
    'Sjálfvirk samantekt og glósur',
    'Samantekt send í tölvupóst',
    '60 mínútur í 7 daga',
  ],
  paid: [
    'Hljóðritun á íslensku',
    'Sjálfvirk samantekt og glósur',
    'Samtalsaðstoð í rauntíma (Beta)',
    'Samantekt send í tölvupóst',
    'Og margt fleira...',
  ],
}

export default function VerdskraPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-zinc-100 mb-3">Verðskrá</h1>
          <p className="text-zinc-400">
            Byrjaðu með ókeypis prufutímabili. Uppfærðu þegar þér hentar.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Prufa */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Prufa</h2>
              <p className="text-sm text-zinc-500 mt-1">Prófaðu þjónustuna ókeypis</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-zinc-100">0 kr.</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {features.trial.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/nyskraning"
              className="block text-center rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              Byrja prufu
            </a>
          </div>

          {/* Áskrift */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-indigo-500 text-xs font-semibold text-white">
              Mælt með
            </div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">Áskrift</h2>
              <p className="text-sm text-zinc-500 mt-1">Fyrir einstaklinga og teymi</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-zinc-100">—</span>
                <span className="text-sm text-zinc-500 ml-2">/ mánuði</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Verð verður tilkynnt fljótlega</p>
            </div>
            <ul className="space-y-3 mb-6">
              {features.paid.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="block w-full text-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
            >
              Kemur fljótlega
            </button>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-zinc-600">
          Greiðslur eru unnar af Paddle.com Market Limited sem viðurkenndur söluaðili.<br />
          VSK er innifalinn í öllum verðum.
        </div>
      </div>
    </div>
  )
}
