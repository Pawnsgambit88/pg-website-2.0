import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ActionRow } from '@/components/layout/ActionRow'
import { Grid } from '@/components/layout/Grid'
import { Section, type SectionTone } from '@/components/layout/Section'
import { Shell } from '@/components/layout/Shell'
import { Stack } from '@/components/layout/Stack'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Heading } from '@/components/ui/Heading'
import { InfoRow } from '@/components/ui/InfoRow'
import { InfoStack } from '@/components/ui/InfoStack'
import { PageIntro } from '@/components/ui/PageIntro'
import { Surface, type SurfaceTone } from '@/components/ui/Surface'
import { Text } from '@/components/ui/Text'
import { expectNoAxeViolations } from '@/test/axe'
import { renderUi } from '@/test/render'

describe('Shell', () => {
  it('applies the shell utility (max 1440, 20/36 gutters) and merges className', () => {
    const { container } = renderUi(<Shell className="py-4">x</Shell>)
    const el = container.firstElementChild
    expect(el?.tagName).toBe('DIV')
    expect(el?.className).toBe('shell py-4')
  })

  it('renders the requested element', () => {
    const { container } = renderUi(<Shell as="footer">x</Shell>)
    expect(container.firstElementChild?.tagName).toBe('FOOTER')
  })
})

describe('Section', () => {
  it('renders a section containing a Shell by default', () => {
    const { container } = renderUi(<Section>content</Section>)
    const section = container.firstElementChild
    expect(section?.tagName).toBe('SECTION')
    expect(section?.firstElementChild?.className).toContain('shell')
  })

  it('can be uncontained and can render as div', () => {
    const { container } = renderUi(
      <Section as="div" contained={false}>
        <span>full bleed</span>
      </Section>,
    )
    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.firstElementChild?.tagName).toBe('SPAN')
  })

  it.each<[SectionTone, string]>([
    ['parchment', 'bg-parchment'],
    ['parchment-soft', 'bg-parchment-soft'],
    ['sand', 'bg-sand'],
    ['forest', 'surface-dark'],
  ])('tone %s uses %s', (tone, cls) => {
    const { container } = renderUi(<Section tone={tone}>x</Section>)
    expect(container.firstElementChild?.className).toContain(cls)
  })

  it('marks only the forest tone as a dark surface (focus ring and eyebrow follow)', () => {
    const { container, rerender } = renderUi(<Section tone="forest">x</Section>)
    expect(container.firstElementChild?.getAttribute('data-surface')).toBe('dark')
    rerender(<Section tone="sand">x</Section>)
    expect(container.firstElementChild?.hasAttribute('data-surface')).toBe(false)
  })

  it('is a named region when given aria-labelledby', () => {
    renderUi(
      <Section aria-labelledby="t">
        <Heading level={2} id="t">
          Events
        </Heading>
      </Section>,
    )
    expect(screen.getByRole('region', { name: 'Events' })).toBeTruthy()
  })
})

describe('Surface', () => {
  it.each<[SurfaceTone, string]>([
    ['paper', 'bg-parchment-soft'],
    ['admin', 'bg-admin-panel'],
    ['forest', 'surface-dark'],
  ])('tone %s uses %s', (tone, cls) => {
    const { container } = renderUi(<Surface tone={tone}>x</Surface>)
    expect(container.firstElementChild?.className).toContain(cls)
  })
})

describe('Stack, Grid and ActionRow', () => {
  it('Stack is a vertical flex with a token gap', () => {
    const { container } = renderUi(<Stack gap="lg">x</Stack>)
    expect(container.firstElementChild?.className).toContain('flex-col')
    expect(container.firstElementChild?.className).toContain('gap-6')
  })

  it('Grid is one column on mobile and widens at sm, md and lg; children may shrink', () => {
    const { container } = renderUi(
      <>
        <Grid columns={2}>x</Grid>
        <Grid columns={3}>x</Grid>
        <Grid columns={4}>x</Grid>
      </>,
    )
    const [two, three, four] = Array.from(container.children)
    for (const el of [two, three, four]) {
      expect(el?.className).toContain('grid-cols-1')
      expect(el?.className).toContain('*:min-w-0')
    }
    expect(two?.className).toContain('sm:grid-cols-2')
    expect(three?.className).toContain('md:grid-cols-3')
    expect(four?.className).toContain('lg:grid-cols-4')
  })

  it('Grid as list keeps list semantics', () => {
    renderUi(
      <Grid as="ul">
        <li>a</li>
        <li>b</li>
      </Grid>,
    )
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
  })

  it('ActionRow stacks on mobile by default and can opt out', () => {
    const { container } = renderUi(
      <>
        <ActionRow>x</ActionRow>
        <ActionRow stackOnMobile={false} align="end">
          x
        </ActionRow>
      </>,
    )
    expect(container.children[0]?.className).toContain('flex-col')
    expect(container.children[1]?.className).not.toContain('flex-col')
    expect(container.children[1]?.className).toContain('sm:justify-end')
  })
})

describe('InfoStack and InfoRow', () => {
  it('render a description list with a term and description per row', () => {
    const { container } = renderUi(
      <InfoStack>
        <InfoRow label="Entry">Free</InfoRow>
        <InfoRow label="Venue">Pawn&apos;s Gambit Cafe</InfoRow>
      </InfoStack>,
    )
    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelectorAll('dt')).toHaveLength(2)
    expect(container.querySelectorAll('dd')).toHaveLength(2)
  })
})

describe('PageIntro', () => {
  it('renders eyebrow, a single h1, description and actions', () => {
    renderUi(
      <PageIntro
        eyebrow="Player"
        title="Your week"
        description="Next event and rating."
        actions={<a href="/x">Go</a>}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Your week' })).toBeTruthy()
    expect(screen.getByText('Player')).toBeTruthy()
    expect(screen.getByText('Next event and rating.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go' })).toBeTruthy()
  })

  it('omits optional parts when absent and supports the admin variant', () => {
    const { container } = renderUi(<PageIntro title="Operations" variant="admin" />)
    expect(container.querySelectorAll('p')).toHaveLength(0)
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
  })
})

describe('tokens only', () => {
  const files = [
    'components/layout/Shell.tsx',
    'components/layout/Section.tsx',
    'components/layout/Grid.tsx',
    'components/layout/Stack.tsx',
    'components/layout/ActionRow.tsx',
    'components/ui/Surface.tsx',
    'components/ui/Heading.tsx',
    'components/ui/Eyebrow.tsx',
    'components/ui/Text.tsx',
    'components/ui/Divider.tsx',
    'components/ui/InfoRow.tsx',
    'components/ui/InfoStack.tsx',
    'components/ui/PageIntro.tsx',
    'components/ui/VisuallyHidden.tsx',
  ]

  it.each(files)('%s has no hex, colour functions or arbitrary values and no client directive', (file) => {
    const source = readFileSync(join(process.cwd(), 'src', file), 'utf8')
    expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(source).not.toMatch(/\b(?:rgba?|hsla?|oklch)\(/i)
    // Arbitrary-value utilities (a utility name followed by a bracketed value). Selector variants such as
    // in-data-[surface=dark]: end in a colon and are allowed.
    expect(source).not.toMatch(/(?<![:\w-])(?:[a-z]+:)*[a-z-]+-\[[^\]]*\](?!:)/)
    expect(source).not.toMatch(/['"]use client['"]/)
  })
})

describe('composed page', () => {
  it('has no axe violations and a correct heading outline', async () => {
    const { container } = renderUi(
      <main>
        <Section tone="parchment" space="flush">
          <PageIntro eyebrow="Operations" title="Events" description="Everything running this week." variant="admin" />
        </Section>
        <Section tone="sand" aria-labelledby="s1">
          <Eyebrow>Upcoming</Eyebrow>
          <Heading level={2} size="section" id="s1">
            Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious
          </Heading>
          <Text tone="inherit">Body copy on sand.</Text>
          <Grid columns={3}>
            <Surface as="article" aria-labelledby="c1">
              <Heading level={3} size="card" id="c1">
                Card one
              </Heading>
              <InfoStack>
                <InfoRow label="Entry">Free</InfoRow>
              </InfoStack>
            </Surface>
            <Stack>
              <Text variant="lead">Lead text</Text>
            </Stack>
          </Grid>
        </Section>
        <Section tone="forest" aria-labelledby="s2">
          <Eyebrow>Dark</Eyebrow>
          <Heading level={2} id="s2">
            Join us
          </Heading>
          <Text tone="on-dark">On forest.</Text>
          <ActionRow>
            <a href="/a">Primary</a>
            <a href="/b">Secondary</a>
          </ActionRow>
        </Section>
      </main>,
    )
    await expectNoAxeViolations(container)
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)))
    expect(levels).toEqual([1, 2, 3, 2])
  })
})
