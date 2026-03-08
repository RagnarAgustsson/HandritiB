export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-lg bg-zinc-800/60 ${className}`} />
  )
}

export function SessionSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4">
      <Skeleton className="h-5 w-5 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
  )
}
