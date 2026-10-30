import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Calendar with a plus: add the event to a calendar. */
export function CalendarAdd(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 5.5h16V20H4zM4 10h16M8 3v4M16 3v4M12 12.5v5M9.5 15h5" />
    </IconBase>
  )
}
