export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-surface-2 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer
        bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}
