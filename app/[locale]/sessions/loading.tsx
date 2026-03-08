import { SessionSkeleton } from '../../components/Skeleton'

export default function SessionsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="animate-pulse rounded-lg bg-zinc-800/60 h-7 w-32" />
          <div className="animate-pulse rounded-lg bg-zinc-800/60 h-4 w-20" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SessionSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
