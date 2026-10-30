import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Previous (carousel, pagination). */
export function ChevronLeft(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 5l-7 7 7 7" />
    </IconBase>
  )
}
