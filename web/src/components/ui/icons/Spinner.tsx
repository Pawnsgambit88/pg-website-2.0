import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Quarter arc for loading. Rotate a wrapping span (`animate-spin`), never the SVG itself. */
export function Spinner(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3a9 9 0 0 1 9 9" />
    </IconBase>
  )
}
