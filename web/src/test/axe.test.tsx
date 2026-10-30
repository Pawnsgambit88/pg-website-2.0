import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from './axe.ts'
import { renderUi } from './render.tsx'

// Harness sample (TASK-008): proves jsdom, Testing Library, user-event and the axe helper work together,
// and that the helper fails on a real violation.
describe('component test harness', () => {
  it('renders, interacts and passes axe on accessible markup', async () => {
    const { user, container } = renderUi(
      <main>
        <h1>Events</h1>
        <label>
          Name
          <input type="text" />
        </label>
        <button type="button">Save</button>
      </main>,
    )
    await user.type(screen.getByLabelText('Name'), 'Ada')
    expect(screen.getByLabelText('Name')).toHaveProperty('value', 'Ada')
    await expectNoAxeViolations(container)
  })

  it('fails on an unlabelled form control and a button without a name', async () => {
    const { container } = renderUi(
      <div>
        <input type="text" />
        <button type="button" />
      </div>,
    )
    await expect(expectNoAxeViolations(container)).rejects.toThrow(/label|button-name/)
  })
})
