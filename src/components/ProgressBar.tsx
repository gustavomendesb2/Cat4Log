export function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100)
  return (
    <div className="flex items-center gap-3 text-sm text-on-variant">
      <div className="h-1 w-40 rounded bg-surface-bright/40 overflow-hidden">
        <div className="h-full bg-on-surface transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span>{filled}/{total} preenchidos</span>
    </div>
  )
}
