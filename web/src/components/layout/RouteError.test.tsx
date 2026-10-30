import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouteError } from '@/components/layout/RouteError'
import { expectNoAxeViolations } from '@/test/axe'
import { renderUi } from '@/test/render'

describe('RouteError', () => {
  it('offers retry and a way home, and calls retry', async () => {
    const retry = vi.fn()
    const { user } = renderUi(<RouteError error={new Error('boom')} retry={retry} area="this page" />)
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('alert')).toBeTruthy()
  })

  it('never renders the error message, stack or PII', () => {
    const error = Object.assign(new Error('token=abc123 user@example.com'), { digest: 'd1g3st-42' })
    const { container } = renderUi(<RouteError error={error} retry={() => undefined} area="this page" />)
    expect(container.textContent).not.toMatch(/abc123|user@example\.com|boom|\bat\s.+:\d+/)
    expect(container.textContent).toContain('d1g3st-42')
  })

  it('ignores a malformed digest and non-Error throws', () => {
    const { container } = renderUi(
      <RouteError error={{ digest: '<script>alert(1)</script>' }} retry={() => undefined} area="this page" />,
    )
    expect(container.textContent).not.toContain('script')
    expect(container.textContent).not.toContain('Reference')
  })

  it('has no axe violations', async () => {
    const { container } = renderUi(<RouteError error={null} retry={() => undefined} area="this page" />)
    await expectNoAxeViolations(container)
  })
})
