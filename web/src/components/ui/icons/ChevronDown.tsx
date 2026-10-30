import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Disclosure / select arrow pointing down. */
export function ChevronDown(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 9l6 6 6-6" />
    </IconBase>
  )
}
