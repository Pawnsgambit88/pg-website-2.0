import { act, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Reveal } from '@/components/ui/motion/Reveal'
import { expectNoAxeViolations } from '@/test/axe'

// Mocked IntersectionObserver: records every instance so tests can count observers and fire entries by hand.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = []
  observed = new Set<Element>()
  disconnected = false
  constructor(public callback: IntersectionObserverCallback) {
    MockIntersectionObserver.instances.push(this)
  }
  observe = (element: Element) => void this.observed.add(element)
  unobserve = (element: Element) => void this.observed.delete(element)
  disconnect = () => {
    this.observed.clear()
    this.disconnected = true
  }
  takeRecords = () => []
  fire(element: Element, isIntersecting: boolean, top = 0) {
    this.callback(
      [{ target: element, isIntersecting, boundingClientRect: { top } } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    )
  }
}

const VIEWPORT = 800
const BELOW = 2000
const live = () => MockIntersectionObserver.instances.filter((io) => !io.disconnected)

function mockMatchMedia(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: reduced && query.includes('reduce'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

// jsdom has no layout: the element's `data-top` stands in for its viewport offset.
const rectSpy = () =>
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const top = Number(this.getAttribute('data-top') ?? 0)
    return { top, bottom: top + 100, left: 0, right: 100, width: 100, height: 100, x: 0, y: top, toJSON: () => ({}) }
  })

beforeEach(() => {
  MockIntersectionObserver.instances = []
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  vi.stubGlobal('innerHeight', VIEWPORT)
  mockMatchMedia(false)
  rectSpy()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Reveal', () => {
  it('server output is visible: content present, no data-reveal, reveal class only', () => {
    const html = renderToString(
      <Reveal as="section" delay={2} className="extra">
        Hello world
      </Reveal>,
    )
    expect(html).toContain('Hello world')
    expect(html).not.toContain('data-reveal')
    expect(html).toMatch(/^<section class="reveal reveal-delay-2 extra"/)
  })

  it('renders the requested element and forwards props', () => {
    render(
      <Reveal as="article" id="a" aria-label="Story">
        body
      </Reveal>,
    )
    const node = screen.getByLabelText('Story')
    expect(node.tagName).toBe('ARTICLE')
    expect(node.id).toBe('a')
    expect(node.className).toBe('reveal')
  })

  it('hides only below-the-fold content, and reveals it exactly once', () => {
    render(
      <Reveal data-top={BELOW} data-testid="r">
        below
      </Reveal>,
    )
    const node = screen.getByTestId('r')
    expect(node.getAttribute('data-reveal')).toBe('pending')
    const io = live()[0]
    expect(io?.observed.has(node)).toBe(true)

    act(() => io?.fire(node, true))
    expect(node.getAttribute('data-reveal')).toBe('revealed')
    expect(io?.observed.has(node)).toBe(false) // unobserved after the first reveal
    expect(live()).toHaveLength(0) // last target gone: observer released

    // A late duplicate entry cannot re-hide it.
    act(() => io?.fire(node, false, BELOW))
    expect(node.getAttribute('data-reveal')).toBe('revealed')
  })

  it('never hides or observes above-the-fold content (LCP safety)', () => {
    render(
      <Reveal data-top={100} data-testid="r">
        hero
      </Reveal>,
    )
    expect(screen.getByTestId('r').hasAttribute('data-reveal')).toBe(false)
    expect(MockIntersectionObserver.instances).toHaveLength(0)
  })

  it('50 targets share one observer', () => {
    render(
      <>
        {Array.from({ length: 50 }, (_, i) => (
          <Reveal key={i} data-top={BELOW + i * 100} data-testid="r">
            item {i}
          </Reveal>
        ))}
      </>,
    )
    expect(MockIntersectionObserver.instances).toHaveLength(1)
    expect(live()[0]?.observed.size).toBe(50)
    expect(screen.getAllByTestId('r').every((n) => n.getAttribute('data-reveal') === 'pending')).toBe(true)
  })

  it('keeps one observer through reveals and later mounts while targets remain', () => {
    const first = render(
      <>
        <Reveal data-top={BELOW} data-testid="a">
          a
        </Reveal>
        <Reveal data-top={BELOW} data-testid="b">
          b
        </Reveal>
      </>,
    )
    act(() => live()[0]?.fire(screen.getByTestId('a'), true))
    first.rerender(
      <>
        <Reveal data-top={BELOW} data-testid="a">
          a
        </Reveal>
        <Reveal data-top={BELOW} data-testid="b">
          b
        </Reveal>
        <Reveal data-top={BELOW} data-testid="c">
          c
        </Reveal>
      </>,
    )
    expect(MockIntersectionObserver.instances).toHaveLength(1)
    expect(live()[0]?.observed.size).toBe(2) // b and c; a was released
  })

  it('unobserves on unmount, never leaves a node hidden, and disconnects with the last target', () => {
    const { unmount } = render(
      <Reveal data-top={BELOW} data-testid="r">
        x
      </Reveal>,
    )
    const node = screen.getByTestId('r')
    const io = live()[0]
    expect(io?.observed.size).toBe(1)
    unmount()
    expect(io?.observed.size).toBe(0)
    expect(io?.disconnected).toBe(true)
    expect(node.getAttribute('data-reveal')).not.toBe('pending')
  })

  it('survives StrictMode double effects and still reveals', () => {
    render(
      <StrictMode>
        <Reveal data-top={BELOW} data-testid="r">
          x
        </Reveal>
      </StrictMode>,
    )
    const node = screen.getByTestId('r')
    expect(node.getAttribute('data-reveal')).toBe('pending')
    expect(live()).toHaveLength(1)
    act(() => live()[0]?.fire(node, true))
    expect(node.getAttribute('data-reveal')).toBe('revealed')
  })

  it('once={false} re-arms when leaving through the bottom edge, not the top', () => {
    render(
      <Reveal once={false} data-top={BELOW} data-testid="r">
        x
      </Reveal>,
    )
    const node = screen.getByTestId('r')
    const io = live()[0]
    act(() => io?.fire(node, true))
    expect(node.getAttribute('data-reveal')).toBe('revealed')
    expect(io?.observed.has(node)).toBe(true)
    act(() => io?.fire(node, false, -500)) // scrolled past the top
    expect(node.getAttribute('data-reveal')).toBe('revealed')
    act(() => io?.fire(node, false, BELOW)) // scrolled back up
    expect(node.getAttribute('data-reveal')).toBe('pending')
  })

  it('reduced motion: immediately visible, no observer', () => {
    mockMatchMedia(true)
    render(
      <Reveal data-top={BELOW} data-testid="r">
        x
      </Reveal>,
    )
    expect(screen.getByTestId('r').hasAttribute('data-reveal')).toBe(false)
    expect(MockIntersectionObserver.instances).toHaveLength(0)
  })

  it('no IntersectionObserver: immediately visible', () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    render(
      <Reveal data-top={BELOW} data-testid="r">
        x
      </Reveal>,
    )
    expect(screen.getByTestId('r').hasAttribute('data-reveal')).toBe(false)
  })

  it('observer construction failure: immediately visible', () => {
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor() {
          throw new Error('blocked')
        }
      },
    )
    render(
      <Reveal data-top={BELOW} data-testid="r">
        x
      </Reveal>,
    )
    expect(screen.getByTestId('r').hasAttribute('data-reveal')).toBe(false)
  })

  it('has no axe violations in pending or revealed state', async () => {
    const { container } = render(
      <main>
        <Reveal as="section" aria-label="Story" data-top={BELOW} data-testid="r">
          <h1>Heading</h1>
          <p>Body copy</p>
        </Reveal>
      </main>,
    )
    await expectNoAxeViolations(container)
    act(() => live()[0]?.fire(screen.getByTestId('r'), true))
    await expectNoAxeViolations(container)
  })
})
