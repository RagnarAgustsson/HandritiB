'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">Eitthvað fór úrskeiðis</h2>
      <p className="text-zinc-500 mb-8 text-sm max-w-sm">
        {error.message || 'Villa kom upp. Reyndu aftur eða hafðu samband ef vandinn heldur áfram.'}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 transition"
      >
        Reyna aftur
      </button>
    </div>
  )
}
