import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Pause (carousel autoplay control, WCAG 2.2.2). */
export function Pause(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </IconBase>
  )
}
