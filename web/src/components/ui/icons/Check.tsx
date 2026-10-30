import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Tick. Replaces the reference text glyph `✓` (completed timeline step). */
export function Check(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </IconBase>
  )
}
