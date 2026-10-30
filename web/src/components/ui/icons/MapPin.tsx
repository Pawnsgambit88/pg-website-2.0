import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Venue / map link. */
export function MapPin(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 21.5S5 15.5 5 9.5a7 7 0 0 1 14 0c0 6-7 12-7 12z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </IconBase>
  )
}
