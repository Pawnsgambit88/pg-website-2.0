import type { HTMLAttributes, HTMLInputAutoCompleteAttribute } from 'react'

/**
 * `inputMode` + `autoComplete` presets so every form asks the browser the same way (right mobile keyboard, working
 * autofill and password managers). Use via `<Input preset="email" />`; explicit props override the preset.
 */
export type InputPreset =
  | 'name'
  | 'email'
  | 'phone'
  | 'username'
  | 'password-current'
  | 'password-new'
  | 'one-time-code'
  | 'search'
  | 'integer'
  | 'decimal'

interface PresetValue {
  type: 'text' | 'email' | 'password' | 'tel' | 'number' | 'search'
  inputMode: HTMLAttributes<HTMLInputElement>['inputMode']
  autoComplete: HTMLInputAutoCompleteAttribute
  autoCapitalize?: 'none' | 'words'
  spellCheck?: boolean
}

export const INPUT_PRESETS: Readonly<Record<InputPreset, PresetValue>> = {
  name: { type: 'text', inputMode: 'text', autoComplete: 'name', autoCapitalize: 'words' },
  email: { type: 'email', inputMode: 'email', autoComplete: 'email', autoCapitalize: 'none', spellCheck: false },
  phone: { type: 'tel', inputMode: 'tel', autoComplete: 'tel' },
  username: { type: 'text', inputMode: 'text', autoComplete: 'username', autoCapitalize: 'none', spellCheck: false },
  'password-current': { type: 'password', inputMode: 'text', autoComplete: 'current-password', autoCapitalize: 'none' },
  'password-new': { type: 'password', inputMode: 'text', autoComplete: 'new-password', autoCapitalize: 'none' },
  'one-time-code': { type: 'text', inputMode: 'numeric', autoComplete: 'one-time-code' },
  search: { type: 'search', inputMode: 'search', autoComplete: 'off' },
  // Numbers that are not quantities (ratings, ages) use a text input with a numeric keypad, not type="number" spinners.
  integer: { type: 'text', inputMode: 'numeric', autoComplete: 'off' },
  decimal: { type: 'text', inputMode: 'decimal', autoComplete: 'off' },
}
