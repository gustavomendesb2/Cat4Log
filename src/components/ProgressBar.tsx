export function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return (
    <div className="flex items-center gap-3 text-sm text-on-variant">
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-surface-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums">
        <span className="font-medium text-on-surface">{filled}</span>/{total}
        <span className="ml-1 text-on-faint">· {pct}%</span>
      </span>
    </div>
  )
}
