import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Divider } from '@/components/ui/Divider'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { nextHeadingLevel } from '@/components/ui/headingLevel'
import { Text } from '@/components/ui/Text'
import { VisuallyHidden } from '@/components/ui/VisuallyHidden'
import { renderUi } from '@/test/render'

describe('Heading', () => {
  it('renders the element for the level, whatever the size', () => {
    renderUi(
      <>
        <Heading level={2} size="hero">
          Big h2
        </Heading>
        <Heading level={1} size="card">
          Small h1
        </Heading>
        <Heading level={4}>Default h4</Heading>
      </>,
    )
    expect(screen.getByRole('heading', { level: 2, name: 'Big h2' }).tagName).toBe('H2')
    expect(screen.getByRole('heading', { level: 1, name: 'Small h1' }).tagName).toBe('H1')
    expect(screen.getByRole('heading', { level: 4, name: 'Default h4' }).tagName).toBe('H4')
  })

  it('maps each size to its type token and keeps the level independent', () => {
    renderUi(
      <>
        <Heading level={3} size="hero">
          a
        </Heading>
        <Heading level={3} size="section">
          b
        </Heading>
        <Heading level={3} size="page-intro">
          c
        </Heading>
      </>,
    )
    const [a, b, c] = screen.getAllByRole('heading', { level: 3 })
    expect(a?.className).toContain('text-hero')
    expect(b?.className).toContain('text-section')
    expect(c?.className).toContain('text-page-intro')
  })

  it('wraps long words and takes id and className', () => {
    renderUi(
      <Heading level={2} id="h" className="mt-4">
        Supercalifragilisticexpialidocious
      </Heading>,
    )
    const h = screen.getByRole('heading', { level: 2 })
    expect(h.id).toBe('h')
    expect(h.className).toContain('wrap-break-word')
    expect(h.className).toContain('mt-4')
  })

  it('nextHeadingLevel steps down one level and stops at 6', () => {
    expect(nextHeadingLevel(1)).toBe(2)
    expect(nextHeadingLevel(5)).toBe(6)
    expect(nextHeadingLevel(6)).toBe(6)
  })
})

describe('Eyebrow', () => {
  it('is a paragraph by default using the type-eyebrow utility and copper-dark text', () => {
    renderUi(<Eyebrow>Player</Eyebrow>)
    const el = screen.getByText('Player')
    expect(el.tagName).toBe('P')
    expect(el.className).toContain('type-eyebrow')
    expect(el.className).toContain('text-copper-dark')
    expect(el.className).toContain('in-data-[surface=dark]:text-copper-soft')
  })

  it('can render as a span', () => {
    renderUi(<Eyebrow as="span">Label</Eyebrow>)
    expect(screen.getByText('Label').tagName).toBe('SPAN')
  })
})

describe('Text', () => {
  it('renders a muted body paragraph by default', () => {
    renderUi(<Text>Hello</Text>)
    const el = screen.getByText('Hello')
    expect(el.tagName).toBe('P')
    expect(el.className).toContain('text-body')
    expect(el.className).toContain('text-muted')
  })

  it('lead uses the display font and inherits colour; inherit and on-dark are explicit', () => {
    renderUi(
      <>
        <Text variant="lead">Lead</Text>
        <Text tone="inherit">Inherit</Text>
        <Text tone="on-dark">Dark</Text>
        <Text variant="small">Small</Text>
      </>,
    )
    const lead = screen.getByText('Lead')
    expect(lead.className).toContain('font-display')
    expect(lead.className).not.toContain('text-muted')
    expect(screen.getByText('Inherit').className).not.toContain('text-muted')
    expect(screen.getByText('Dark').className).toContain('text-parchment-muted')
    expect(screen.getByText('Small').className).toContain('text-sm')
  })
})

describe('Divider', () => {
  it('is hidden from assistive technology by default and exposed when not decorative', () => {
    const { container, rerender } = renderUi(<Divider />)
    expect(container.querySelector('hr')?.getAttribute('aria-hidden')).toBe('true')
    rerender(<Divider decorative={false} tone="light" />)
    const hr = container.querySelector('hr')
    expect(hr?.hasAttribute('aria-hidden')).toBe(false)
    expect(hr?.className).toContain('border-line-light')
  })
})

describe('VisuallyHidden', () => {
  it('keeps text in the accessibility tree behind the sr-only class', () => {
    renderUi(
      <button type="button">
        <VisuallyHidden>Open menu</VisuallyHidden>
      </button>,
    )
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
    expect(screen.getByText('Open menu').className).toBe('sr-only')
  })
})
