import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Menu trigger (three bars). */
export function Menu(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </IconBase>
  )
}
