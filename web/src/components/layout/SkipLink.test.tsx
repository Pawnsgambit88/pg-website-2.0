import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MainLandmark } from '@/components/layout/MainLandmark'
import { SkipLink } from '@/components/layout/SkipLink'
import { expectNoAxeViolations } from '@/test/axe'
import { renderUi } from '@/test/render'

function Page() {
  return (
    <>
      <SkipLink />
      <header>
        <button type="button">Home</button>
      </header>
      <MainLandmark>
        <h1>Title</h1>
      </MainLandmark>
    </>
  )
}

describe('SkipLink', () => {
  it('is the first focusable element and targets the main landmark', async () => {
    const { user } = renderUi(<Page />)
    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link.getAttribute('href')).toBe('#main')
    await user.tab()
    expect(document.activeElement).toBe(link)
    const main = screen.getByRole('main')
    expect(main.id).toBe('main')
    expect(main.getAttribute('tabindex')).toBe('-1')
  })

  it('is operable from the keyboard and tabs on to the next control', async () => {
    const { user } = renderUi(<Page />)
    await user.tab()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Home' }))
  })

  it('has no axe violations in a page shell', async () => {
    const { container } = renderUi(<Page />)
    await expectNoAxeViolations(container)
  })
})
