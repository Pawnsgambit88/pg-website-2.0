import { IconBase, type IconProps } from '@/components/ui/icons/IconBase'

/** Four-square board outline: the default empty-state glyph (a chessboard, no unrelated metaphor). */
export function Board(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 4h16v16H4zM12 4v16M4 12h16" />
    </IconBase>
  )
}
