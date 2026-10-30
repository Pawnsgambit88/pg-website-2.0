import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Arrow leaving a box: marks a link that leaves the site. */
export function ExternalLink(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
    </IconBase>
  )
}
