'use client'

import { useState } from 'react'
import { Send, Loader2, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function ContactForm() {
  const t = useTranslations('contact')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setError('')

    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), message: message.trim() }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.villa || t('error'))
      setStatus('error')
      return
    }

    setStatus('sent')
    setEmail('')
    setMessage('')
  }

  if (status === 'sent') {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
        <CheckCircle className="h-4 w-4" />
        {t('success')}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <input
        type="email"
        required
        placeholder={t('emailPlaceholder')}
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
      />
      <textarea
        required
        placeholder={t('messagePlaceholder')}
        maxLength={2000}
        rows={3}
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 resize-none"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition disabled:opacity-50"
      >
        {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {t('send')}
      </button>
    </form>
  )
}
