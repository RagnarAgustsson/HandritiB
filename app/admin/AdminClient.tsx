'use client'

import { useState, useEffect } from 'react'
import { Shield, Clock, Users, ChevronLeft, ChevronRight, Loader2, Search, UserPlus } from 'lucide-react'

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
}

const actionLabels: Record<string, string> = {
  'lota.stofna': 'Ný lota',
  'lota.ljuka': 'Lotu lokið',
  'lota.endurnefna': 'Endurnefna',
  'skra.hlada': 'Skrá hlaðin upp',
  'beinlina.hefja': 'Beinlína hafin',
  'beinlina.vista': 'Beinlína vistuð',
  'admin.uppfaera': 'Stjórnandabreyting',
}

export default function AdminClient() {
  const [log, setLog] = useState<AuditEntry[]>([])
  const [users, setUsers] = useState<UserEntry[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [tab, setTab] = useState<'log' | 'users'>('log')
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
      setSearchError('Notandi finnst ekki með þetta netfang')
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

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Stjórnborð</h1>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab('log')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'log' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Clock className="h-4 w-4" /> Aðgerðaskrá
          </button>
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              tab === 'users' ? 'bg-indigo-500/20 text-indigo-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}>
            <Users className="h-4 w-4" /> Notendur
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-zinc-400 py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            Hleð...
          </div>
        ) : tab === 'log' ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            {log.length === 0 ? (
              <div className="px-4 py-12 text-center text-zinc-500">Engar aðgerðir enn.</div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-left text-zinc-500">
                        <th className="px-4 py-3 font-medium">Tími</th>
                        <th className="px-4 py-3 font-medium">Notandi</th>
                        <th className="px-4 py-3 font-medium">Aðgerð</th>
                        <th className="px-4 py-3 font-medium">Upplýsingar</th>
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
                              {actionLabels[entry.action] || entry.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-zinc-500 text-xs truncate max-w-[200px]">
                            {entry.details || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {pages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                    <span className="text-sm text-zinc-500">Síða {page} af {pages}</span>
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
        ) : (
          <div className="space-y-4">
            <form onSubmit={searchUser} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  placeholder="Leita að notanda eftir netfangi..."
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button type="submit" disabled={searching || !searchEmail.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/30 transition disabled:opacity-30">
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Leita'}
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
                    {searchResult.isAdmin ? 'Er nú þegar stjórnandi' : 'Ekki stjórnandi'}
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
                  {searchResult.isAdmin ? 'Fjarlægja' : 'Gera stjórnanda'}
                </button>
              </div>
            )}

            <div className="space-y-2">
            {users.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">Engir notendur enn.</div>
            ) : (
              users.map(u => (
                <div key={u.userId}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                  <div>
                    <div className="text-zinc-100 text-sm">{u.email}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      Síðast innskráð: {new Date(u.lastSeen).toLocaleDateString('is-IS')}
                    </div>
                  </div>
                  <button onClick={() => toggleAdmin(u.userId, u.email, u.isAdmin)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                      u.isAdmin
                        ? 'bg-indigo-500/20 text-indigo-400 hover:bg-red-500/20 hover:text-red-400'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-indigo-500/20 hover:text-indigo-400'
                    }`}>
                    <Shield className="h-4 w-4" />
                    {u.isAdmin ? 'Stjórnandi' : 'Gera stjórnanda'}
                  </button>
                </div>
              ))
            )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
