'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function EyðaHnappur({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const [erAðEyða, setErAðEyða] = useState(false)

  async function eyða(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Ertu viss? Þetta eyðir lotunni og öllu sem henni fylgir varanlega.')) return
    setErAðEyða(true)
    await fetch(`/api/lotur?sessionId=${sessionId}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <button
      onClick={eyða}
      disabled={erAðEyða}
      className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
      title="Eyða lotu"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  )
}
