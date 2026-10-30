import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Close / dismiss. */
export function Close(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 5l14 14M19 5L5 19" />
    </IconBase>
  )
}
