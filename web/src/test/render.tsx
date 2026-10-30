import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'

/** Render with a `user-event` instance bound to the same test (use `user`, not `fireEvent`). */
export function renderUi(ui: ReactElement) {
  const user = userEvent.setup()
  return { user, ...render(ui) }
}
