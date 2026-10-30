import { fireEvent, render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MediaRef } from '@/lib/api/types/media'
import { expectNoAxeViolations } from '@/test/axe'
import { MediaFrame } from './MediaFrame'
import { ResponsiveImage } from './ResponsiveImage'
import { DEFAULT_BLUR_DATA_URL } from './placeholders'
import { PRIORITY_GUARD_MESSAGE, livePriorityImageCount, resetPriorityGuard } from './priorityGuard'
import { SLOT_PRESETS } from './sizes'

const photo: MediaRef = {
  src: '/placeholders/tile-4x3.png',
  width: 960,
  height: 720,
  focal: { x: 0.25, y: 0.75 },
  decorative: false,
  alt: 'Players at the long table after a game',
}

const decorativePhoto: MediaRef = { ...photo, decorative: true, alt: '' }

beforeEach(() => {
  resetPriorityGuard()
})
afterEach(() => {
  vi.restoreAllMocks()
})

const img = () => document.querySelector('img') as HTMLImageElement

describe('ResponsiveImage: alt rules', () => {
  it('renders the alt text of an informative image', () => {
    render(<ResponsiveImage {...photo} slot="card" />)
    expect(screen.getByRole('img', { name: photo.alt })).toBeTruthy()
  })

  it('renders decorative images with an empty alt (presentational)', () => {
    render(<ResponsiveImage {...decorativePhoto} slot="card" />)
    expect(img().getAttribute('alt')).toBe('')
  })

  it('makes a missing alt a type error', () => {
    // @ts-expect-error alt is required unless the image is explicitly decorative
    const missing: MediaRef = { ...photo, decorative: false, alt: undefined }
    // @ts-expect-error decorative images must carry the empty alt
    const wrongDecorative: MediaRef = { ...photo, decorative: true, alt: 'text' }
    expect([missing, wrongDecorative]).toHaveLength(2)
  })

  it('throws at runtime in development when an informative image has a blank alt', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => render(<ResponsiveImage {...photo} alt="   " />)).toThrow(/no alt text/)
  })
})

describe('ResponsiveImage: layout, sizes and no layout shift', () => {
  it('uses fill inside an aspect-ratio box and the slot sizes string', () => {
    const { container } = render(<ResponsiveImage {...photo} slot="card" />)
    const box = container.firstElementChild as HTMLElement
    expect(box.className).toContain('aspect-16/9')
    expect(box.getAttribute('data-ratio')).toBe('16:9')
    expect(img().getAttribute('sizes')).toBe(SLOT_PRESETS.card.sizes)
    expect(img().className).toContain('object-cover')
  })

  it('lets an explicit ratio and sizes override the slot', () => {
    const { container } = render(<ResponsiveImage {...photo} slot="split" ratio="4:5" sizes="50vw" />)
    expect((container.firstElementChild as HTMLElement).className).toContain('aspect-4/5')
    expect(img().getAttribute('sizes')).toBe('50vw')
  })

  it('always reserves space: a ratio class, or the image own width/height as aspect-ratio', () => {
    const withRatio = render(<ResponsiveImage {...photo} ratio="3:2" />)
    expect((withRatio.container.firstElementChild as HTMLElement).className).toMatch(/aspect-/)
    withRatio.unmount()
    const natural = render(<ResponsiveImage {...photo} />)
    const box = natural.container.firstElementChild as HTMLElement
    expect(box.style.aspectRatio).toBe('960 / 720')
    expect(box.getAttribute('data-ratio')).toBe('natural')
  })

  it('is absolutely sized by the box (fill), not by the file', () => {
    render(<ResponsiveImage {...photo} slot="gallery" />)
    expect(img().style.position).toBe('absolute')
    expect(img().getAttribute('width')).toBeNull()
  })
})

describe('ResponsiveImage: focal point', () => {
  it('maps focal 0..1 to object-position percentages', () => {
    render(<ResponsiveImage {...photo} slot="card" />)
    expect(img().style.objectPosition).toBe('25% 75%')
  })

  it('clamps out-of-range focal values that skipped the schema', () => {
    render(<ResponsiveImage {...photo} focal={{ x: -3, y: 9 }} slot="card" />)
    expect(img().style.objectPosition).toBe('0% 100%')
  })
})

describe('ResponsiveImage: loading and priority', () => {
  it('is lazy by default with no preload', () => {
    render(<ResponsiveImage {...photo} slot="card" />)
    expect(img().getAttribute('loading')).toBe('lazy')
    expect(img().getAttribute('fetchpriority')).toBeNull()
  })

  it('priority is eager with fetchpriority=high', () => {
    render(<ResponsiveImage {...photo} slot="hero" priority />)
    expect(img().getAttribute('loading')).not.toBe('lazy')
    expect(img().getAttribute('fetchpriority')).toBe('high')
  })

  it('guards one priority image per page: a second live one logs an error', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const first = render(<ResponsiveImage {...photo} slot="hero" priority />)
    expect(livePriorityImageCount()).toBe(1)
    expect(error).not.toHaveBeenCalledWith(PRIORITY_GUARD_MESSAGE)
    render(<ResponsiveImage {...photo} slot="eventHero" priority />)
    expect(livePriorityImageCount()).toBe(2)
    expect(error).toHaveBeenCalledWith(PRIORITY_GUARD_MESSAGE)
    first.unmount()
    expect(livePriorityImageCount()).toBe(1)
  })

  it('does not count non-priority images', () => {
    render(<ResponsiveImage {...photo} slot="card" />)
    render(<ResponsiveImage {...photo} slot="card" />)
    expect(livePriorityImageCount()).toBe(0)
  })
})

describe('ResponsiveImage: placeholders and failures', () => {
  it('uses the DTO blur data URL, else the palette-tone constant', () => {
    const custom = 'data:image/png;base64,AAAA'
    const a = renderToString(<ResponsiveImage {...photo} blurDataUrl={custom} slot="card" />)
    expect(a).toContain('AAAA')
    const b = renderToString(<ResponsiveImage {...photo} slot="card" />)
    expect(b).toContain(DEFAULT_BLUR_DATA_URL.slice(30, 60))
  })

  it('falls back to the local placeholder when the file fails to load', () => {
    const { container } = render(<ResponsiveImage {...photo} src="/uploads/missing.jpg" slot="card" />)
    expect(container.firstElementChild?.getAttribute('data-media-state')).toBe('ok')
    fireEvent.error(img())
    expect(container.firstElementChild?.getAttribute('data-media-state')).toBe('fallback')
    expect(img().getAttribute('src')).toContain(encodeURIComponent('/placeholders/tile-16x9.png'))
  })

  it('never renders a src that fails the allow-list (other host, http, query, protocol-relative, data:)', () => {
    const bad = [
      'https://images.unsplash.com/photo-1.jpg',
      'http://example.com/a.jpg',
      'https://example.com/a.jpg?w=100',
      '//example.com/a.jpg',
      'data:image/png;base64,AAAA',
      'javascript:alert(1)',
      '/../etc/passwd',
      '/uploads/a.jpg?x=1',
    ]
    for (const src of bad) {
      const view = render(<ResponsiveImage {...photo} src={src} slot="card" />)
      expect(view.container.firstElementChild?.getAttribute('data-media-state')).toBe('blocked')
      expect(img().getAttribute('src')).not.toContain('unsplash')
      expect(img().getAttribute('src')).toContain(encodeURIComponent('/placeholders/'))
      view.unmount()
    }
  })
})

describe('MediaFrame', () => {
  it('renders each ratio variant', () => {
    for (const [ratio, cls] of [
      ['1:1', 'aspect-square'],
      ['4:3', 'aspect-4/3'],
      ['3:2', 'aspect-3/2'],
      ['16:9', 'aspect-16/9'],
      ['4:5', 'aspect-4/5'],
    ] as const) {
      const view = render(<MediaFrame media={photo} ratio={ratio} />)
      expect(view.container.querySelector(`[data-ratio="${ratio}"]`)?.className).toContain(cls)
      view.unmount()
    }
  })

  it('uses the 2px public radius and a token border', () => {
    const { container } = render(<MediaFrame media={photo} />)
    expect((container.firstElementChild as HTMLElement).className).toContain('rounded-public')
    expect((container.firstElementChild as HTMLElement).className).toContain('border-line')
  })

  it('renders the empty tile at the same ratio when there is no media', () => {
    const { container } = render(<MediaFrame ratio="3:2" emptyLabel="PHOTO 3:2" />)
    const tile = container.querySelector('.media-frame--empty')
    expect(tile?.className).toContain('aspect-3/2')
    expect(screen.getByText('PHOTO 3:2')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders a tag overlay and a captioned figure', () => {
    render(<MediaFrame media={photo} tag="Sat 12 Oct" caption="Round 3 under way" />)
    expect(screen.getByText('Sat 12 Oct')).toBeTruthy()
    expect(screen.getByRole('figure')).toBeTruthy()
    expect(screen.getByText('Round 3 under way')).toBeTruthy()
  })

  it('has no axe violations (photo, decorative, captioned, empty)', async () => {
    const { container } = render(
      <div>
        <MediaFrame media={photo} tag="Open" caption="Caption" slot="card" />
        <MediaFrame media={decorativePhoto} slot="gallery" />
        <MediaFrame ratio="1:1" emptyLabel="PHOTO 1:1" />
        <ResponsiveImage {...photo} slot="avatar" />
      </div>,
    )
    await expectNoAxeViolations(container)
  })
})
