import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Forward / "see all" arrow. Replaces the reference text glyph `→`. */
export function ArrowRight(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </IconBase>
  )
}
