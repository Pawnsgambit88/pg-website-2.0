import type { MouseEventHandler, ReactNode } from 'react'
import { ActionLink } from '@/components/ui/ActionLink'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { buttonClassName, type ButtonSize, type ButtonVariant } from '@/components/ui/buttonStyles'
import { Spinner } from '@/components/ui/icons/Spinner'
import type { LinkHref } from '@/components/ui/linkHref'

interface ButtonCommonProps {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Stretch to the container width (mobile primary actions). */
  fullWidth?: boolean
  /**
   * Busy: shows a spinner, sets `aria-busy`, keeps focus and blocks activation (no double submit). The visible label
   * stays so the width does not jump; `loadingLabel` is added for screen readers.
   */
  loading?: boolean
  /** Screen-reader text while `loading`. Default "Loading". */
  loadingLabel?: string
  /**
   * Not available right now. Uses `aria-disabled` (the control stays focusable) instead of the `disabled` attribute so
   * keyboard and screen-reader users can reach the reason: render the reason as visible text and link it with
   * `aria-describedby` (ARCH-001 15, AC-84). Never explain a disabled important action with a tooltip only.
   */
  disabled?: boolean
  /** Icon element from components/ui/icons, e.g. `<ArrowRight />`. Decorative: the label carries the name. */
  icon?: ReactNode
  iconPosition?: 'start' | 'end'
  /** Layout additions only (margin, alignment). */
  className?: string
  id?: string
  /** Id of the visible reason or hint text (disabled reason, price note). */
  'aria-describedby'?: string
  /** Only for icon-only buttons or when the visible text is not the full name. */
  'aria-label'?: string
  children: ReactNode
}

export interface ButtonAsButtonProps extends ButtonCommonProps {
  href?: undefined
  /** Defaults to `button` so a button inside a form never submits by accident; pass `submit` explicitly. */
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement>
  form?: string
  name?: string
  value?: string
  newTab?: undefined
  prefetchOnIntent?: undefined
}

export interface ButtonAsLinkProps extends ButtonCommonProps {
  /** Site path, or an absolute http(s), mailto or tel URL. Anything else renders as a disabled placeholder. */
  href: LinkHref
  newTab?: boolean
  /** Prefetch the route only on hover or focus (link-dense surfaces). Loads a small client island. */
  prefetchOnIntent?: boolean
  type?: undefined
  onClick?: undefined
  form?: undefined
  name?: undefined
  value?: undefined
}

export type ButtonProps = ButtonAsButtonProps | ButtonAsLinkProps

/**
 * Call-to-action control (reference `.button`, UI-SPECIFICATION Buttons). Renders a `<button>`, or a link when `href` is
 * set (links navigate, buttons act). Server Component: a static link or button ships no client JS; only
 * `prefetchOnIntent` pulls the PrefetchLink island, and handlers are the caller's (a client parent passes `onClick`).
 *
 * Height: sm 36px (+ 44px hit area), md 46px, lg 48px. Hover lifts 2px on hover-capable devices and not under
 * reduced motion (`lift-on-hover`); focus uses the global ring. Disabled and loading controls keep their label,
 * drop the hover and lift, and never run `onClick`, so no handler needs to guard against a double submit.
 * Colours and the copper decision live in buttonStyles.ts.
 */
export function Button(props: ButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    loadingLabel = 'Loading',
    disabled = false,
    icon,
    iconPosition = 'start',
    className,
    id,
    children,
    'aria-describedby': describedBy,
    'aria-label': ariaLabel,
  } = props
  const blocked = disabled || loading
  const classes = buttonClassName({ variant, size, fullWidth, blocked, loading, className })

  const leading = loading ? (
    <span className="inline-flex motion-safe:animate-spin" aria-hidden="true">
      <Spinner size="sm" />
    </span>
  ) : iconPosition === 'start' ? (
    icon
  ) : null
  const trailing = !loading && iconPosition === 'end' ? icon : null
  const content = (
    <>
      {leading}
      <span className="min-w-0">{children}</span>
      {trailing}
      {loading ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </>
  )

  if (props.href !== undefined) {
    return (
      <ActionLink
        href={props.href}
        className={classes}
        newTab={props.newTab}
        prefetchOnIntent={props.prefetchOnIntent}
        inert={blocked}
        id={id}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
      >
        {content}
      </ActionLink>
    )
  }

  return (
    <button
      // A blocked button is always type="button": it can never submit, whatever `type` the caller asked for.
      type={blocked ? 'button' : (props.type ?? 'button')}
      className={classes}
      id={id}
      form={props.form}
      name={props.name}
      value={props.value}
      aria-disabled={blocked ? true : undefined}
      aria-busy={loading ? true : undefined}
      aria-describedby={describedBy}
      aria-label={ariaLabel}
      onClick={blocked ? undefined : props.onClick}
    >
      {content}
    </button>
  )
}
