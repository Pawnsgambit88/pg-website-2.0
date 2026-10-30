/**
 * Shared look for text-like form controls (Input, Textarea, Select trigger).
 *
 * 48px minimum height (`min-h-control`), 17px text (`text-body`, above the 16px iOS zoom threshold; base.css also pins
 * 16px under 720px). Border uses `muted` (about 5:1 on the field fill) rather than the faint reference `line` colour,
 * so the control boundary meets WCAG 1.4.11 (3:1). The invalid border is paired with adjacent error text, never colour
 * alone. Focus: global 3px ring from base.css plus the soft halo.
 */
export const CONTROL_CLASS =
  'block w-full min-w-0 min-h-control rounded-public border border-muted bg-field px-3 py-3 font-ui text-body text-ink ' +
  'transition-[border-color,box-shadow] duration-control placeholder:text-muted hover:border-ink ' +
  'focus-visible:border-forest focus-visible:shadow-field-focus ' +
  'aria-invalid:border-danger aria-invalid:border-2 ' +
  'disabled:cursor-not-allowed disabled:bg-paper-deep disabled:text-muted disabled:hover:border-muted ' +
  'read-only:bg-parchment-soft'
