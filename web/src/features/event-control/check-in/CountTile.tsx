import { Surface } from '@/components/ui/Surface'

export function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <Surface className="flex min-w-0 flex-col gap-1 p-3">
      <span className="text-2xl font-strong tabular-nums">{value}</span>
      <span className="text-sm wrap-break-word">{label}</span>
    </Surface>
  )
}
