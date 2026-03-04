'use client'

import { useState, useEffect } from 'react'
import { Shield, Clock, Users, ChevronLeft, ChevronRight, Loader2, Search, UserPlus, Gift, MessageSquare, Radio, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface AuditEntry {
  id: string
  userId: string
  email: string
  action: string
  details: string | null
  createdAt: string
}

interface UserEntry {
  userId: string
  email: string
  lastSeen: string
  isAdmin: boolean
  subscription: { status: string; minutesLimit: number } | null
  hasFreeAccess: boolean
  usedMinutes: number
}

interface ContactMsg {
  id: string
  email: string
  message: string
  createdAt: string
}

interface ActiveSession {
  id: string
  userId: string
  email: string
  name: string
  profile: string
  createdAt: string
}

export default function AdminClient() {
  const t = useTranslations('admin')
  const tc = useTranslations('common')
  const [log, setLog] = useState<AuditEntry[]>([])
  const [users, setUsers] = useState<UserEntry[]>([])
  const [messages, setMessages] = useState<ContactMsg[]>([])
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [tab, setTab] = useState<'log' | 'users' | 'messages' | 'sessions'>('log')
  const [loading, setLoading] = useState(true)
  const [searchEmail, setSearchEmail] = useState('')
  const [searchResult, setSearchResult] = useState<UserEntry | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  async function fetchData(p = page) {
    setLoading(true)
    const res = await fetch(`/api/admin?page=${p}`)
    const data = await res.json()
    setLog(data.log)
    setUsers(data.users)
    setMessages(data.messages || [])
    setActiveSessions(data.activeSessions || [])
    setPages(data.pages)
    setLoading(false)
  }

  useEffect(() => { fetchData(page) }, [page])

  async function searchUser(e: React.FormEvent) {
    e.preventDefault()
    if (!searchEmail.trim()) return
    setSearching(true)
    setSearchError('')
    setSearchResult(null)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: searchEmail.trim(), action: 'search' }),
    })
    if (!res.ok) {
      setSearchError(t('userNotFound'))
    } else {
      const data = await res.json()
      setSearchResult(data.user)
    }
    setSearching(false)
  }

  async function toggleAdmin(userId: string, email: string, currentlyAdmin: boolean) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: userId,
        targetEmail: email,
        action: currentlyAdmin ? 'remove' : 'add',
      }),
    })
    fetchData()
  }

  async function closeSessionAction(sessionId: string) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: sessionId, action: 'close-session' }),
    })
    fetchData()
  }

  async function toggleFreeAccess(userId: string, email: string, hasFree: boolean) {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: userId,
        targetEmail: email,
        action: hasFree ? 'revoke-free' : 'grant-free',
      }),
    })
    fetchData()
  }

  function actionLabel(action: string): string {
    const key = `actionLabels.${action.replace(/\./g, '_')}` as any
    // Try to get translation; if key doesn't exist next-intl may throw, so fallback
    try {
      return t(key)
    } catch {
      return action
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">{t('title')}</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button onClick={() => setTab('log')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'log' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Clock className="h-4 w-4" /> {t('tabLog')}
          </button>
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'users' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Users className="h-4 w-4" /> {t('tabUsers')}
          </button>
          <button onClick={() => setTab('messages')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'messages' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <MessageSquare className="h-4 w-4" /> {t('tabMessages')}
            {messages.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-400">
                {messages.length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('sessions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'sessions' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Radio className="h-4 w-4" /> {t('tabActive')}
            {activeSessions.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-400">
                {activeSessions.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-400 py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            {tc('loading')}
          </div>
        ) : tab === 'log' ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {log.length === 0 ? (
              <div className="px-4 py-12 text-center text-zinc-500">{t('noActions')}</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-zinc-500">
                        <th className="px-4 py-3 font-medium">{t('colTime')}</th>
                        <th className="px-4 py-3 font-medium">{t('colUser')}</th>
                        <th className="px-4 py-3 font-medium">{t('colAction')}</th>
                        <th className="px-4 py-3 font-medium">{t('colDetails')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map(entry => (
                        <tr key={entry.id} className="border-b border-zinc-800/50">
                          <td className="px-4 py-3 text-zinc-500 whitespace-nowrap text-xs">
                            {new Date(entry.createdAt).toLocaleString('is-IS')}
                          </td>
                          <td className="px-4 py-3 text-zinc-300 text-xs">{entry.email}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-500/10 text-indigo-400">
                              {actionLabel(entry.action)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-[200px]">
                            {entry.details || '\u2014'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                    <span className="text-sm text-zinc-500">{t('pageOf', { page, pages })}</span>
                    <div className="flex gap-2">
                      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : tab === 'users' ? (
          <div className="space-y-4">
            <form onSubmit={searchUser} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder={t('searchPlaceholder')}
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button type="submit" disabled={searching || !searchEmail.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/30 transition disabled:opacity-30">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : t('search')}
              </button>
            </form>

            {searchError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
                {searchError}
              </div>
            )}

            {searchResult && (
              <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4">
                <div>
                  <div className="text-zinc-100 text-sm flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-indigo-400" />
                    {searchResult.email}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {searchResult.isAdmin ? t('alreadyAdmin') : t('notAdmin')}
                  </div>
                </div>
                <button onClick={async () => {
                  await toggleAdmin(searchResult.userId, searchResult.email, searchResult.isAdmin)
                  setSearchResult(null)
                  setSearchEmail('')
                }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    searchResult.isAdmin
                      ? 'bg-indigo-500/20 text-indigo-400 hover:bg-red-500/20 hover:text-red-400'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-indigo-500/20 hover:text-indigo-400'
                  }`}>
                  <Shield className="h-4 w-4" />
                  {searchResult.isAdmin ? t('remove') : t('makeAdmin')}
                </button>
              </div>
            )}

            <div className="space-y-2">
            {users.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">{t('noUsers')}</div>
            ) : (
              users.map(u => (
                <div key={u.userId}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-zinc-100 text-sm">{u.email}</div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{t('lastSeen', { date: new Date(u.lastSeen).toLocaleDateString('is-IS') })}</span>
                        {u.subscription && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            u.subscription.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                            u.subscription.status === 'trialing' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {u.subscription.status === 'active' ? t('statusActive') :
                             u.subscription.status === 'trialing' ? t('statusTrial') :
                             u.subscription.status}
                          </span>
                        )}
                        {u.hasFreeAccess && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                            {t('badgeFree')}
                          </span>
                        )}
                        {!u.isAdmin && !u.hasFreeAccess && u.subscription && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            u.usedMinutes >= u.subscription.minutesLimit
                              ? 'bg-red-500/10 text-red-400'
                              : 'bg-zinc-500/10 text-zinc-400'
                          }`}>
                            {t('usageDisplay', { used: u.usedMinutes, limit: u.subscription.minutesLimit })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFreeAccess(u.userId, u.email, u.hasFreeAccess)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
                          u.hasFreeAccess
                            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-emerald-500/20 hover:text-emerald-400'
                        }`}>
                        <Gift className="h-3.5 w-3.5" />
                        {u.hasFreeAccess ? t('free') : t('grantFree')}
                      </button>
                      <button onClick={() => toggleAdmin(u.userId, u.email, u.isAdmin)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
                          u.isAdmin
                            ? 'bg-indigo-500/20 text-indigo-400 hover:bg-red-500/20 hover:text-red-400'
                            : 'bg-zinc-800 text-zinc-500 hover:bg-indigo-500/20 hover:text-indigo-400'
                        }`}>
                        <Shield className="h-3.5 w-3.5" />
                        {u.isAdmin ? t('admin') : t('makeAdmin')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            </div>
          </div>
        ) : tab === 'messages' ? (
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-12 text-center text-zinc-500">
                {t('noMessages')}
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-zinc-100">{msg.email}</div>
                    <div className="text-xs text-zinc-500">
                      {new Date(msg.createdAt).toLocaleString('is-IS')}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {activeSessions.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-12 text-center text-zinc-500">
                {t('noActiveSessions')}
              </div>
            ) : (
              activeSessions.map(s => (
                <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-zinc-100">{s.name}</div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 mt-0.5">
                        <span>{s.email}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400">
                          {s.profile}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-zinc-500">
                        {new Date(s.createdAt).toLocaleString('is-IS')}
                      </div>
                      <button onClick={() => closeSessionAction(s.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                        <XCircle className="h-3.5 w-3.5" /> {t('close')}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
