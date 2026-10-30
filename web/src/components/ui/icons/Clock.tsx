import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Time control, start time. */
export function Clock(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </IconBase>
  )
}
