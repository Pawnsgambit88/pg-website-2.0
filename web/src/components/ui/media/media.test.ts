import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { focalToObjectPosition } from './focal'
import { createRenderMediaPolicy, isRenderableMediaSrc } from './mediaPolicy'
import { DEFAULT_BLUR_DATA_URL, PLACEHOLDER_SIZE, PLACEHOLDER_SRC, placeholderForSize } from './placeholders'
import { ASPECT_CLASS, ASPECT_RATIOS, ASPECT_RATIO_VALUE, SLOT_PRESETS, nearestAspectRatio } from './sizes'

const webRoot = resolve(import.meta.dirname, '..', '..', '..', '..')

describe('focalToObjectPosition', () => {
  it('maps 0..1 to percentages', () => {
    expect(focalToObjectPosition({ x: 0, y: 1 })).toBe('0% 100%')
    expect(focalToObjectPosition({ x: 0.5, y: 0.5 })).toBe('50% 50%')
    expect(focalToObjectPosition({ x: 0.3333, y: 0.6667 })).toBe('33.33% 66.67%')
  })
  it('clamps and defaults safely (F-14: only numbers reach the style)', () => {
    expect(focalToObjectPosition({ x: -1, y: 2 })).toBe('0% 100%')
    expect(focalToObjectPosition({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toBe('50% 50%')
    expect(focalToObjectPosition(undefined)).toBe('50% 50%')
    expect(focalToObjectPosition({ x: '10%; background:url(x)' as unknown as number, y: 0 })).toMatch(
      /^[\d.]+% [\d.]+%$/,
    )
  })
})

describe('render media policy', () => {
  const policy = createRenderMediaPolicy({ storageHost: 'abc.supabase.co', bucket: 'media' })
  const ok = 'https://abc.supabase.co/storage/v1/object/public/media/events/a.webp'

  it('accepts the exact host and bucket path, and same-origin paths', () => {
    expect(isRenderableMediaSrc(ok, policy)).toBe(true)
    expect(isRenderableMediaSrc('/placeholders/tile-4x3.png', policy)).toBe(true)
  })
  it('rejects other hosts, buckets, schemes, queries, ports and traversal', () => {
    for (const src of [
      'https://images.unsplash.com/a.jpg',
      'https://evil.supabase.co/storage/v1/object/public/media/a.webp',
      'https://abc.supabase.co/storage/v1/object/public/other/a.webp',
      'https://abc.supabase.co/storage/v1/object/public/media/a.webp?w=1',
      'https://abc.supabase.co:8443/storage/v1/object/public/media/a.webp',
      'http://abc.supabase.co/storage/v1/object/public/media/a.webp',
      'https://abc.supabase.co/storage/v1/object/public/media/../x.webp',
      'https://abc.supabase.co.evil.com/storage/v1/object/public/media/a.webp',
      '//abc.supabase.co/storage/v1/object/public/media/a.webp',
      '',
    ]) {
      expect(isRenderableMediaSrc(src, policy), src).toBe(false)
    }
  })
  it('accepts no remote host when the env is unset (mock mode)', () => {
    const mock = createRenderMediaPolicy({ storageHost: undefined, bucket: undefined })
    expect(isRenderableMediaSrc(ok, mock)).toBe(false)
    expect(isRenderableMediaSrc('/placeholders/tile-1x1.png', mock)).toBe(true)
  })
})

describe('sizes presets and ratios', () => {
  it('has a sizes string and ratio for every slot, and the documented values', () => {
    expect(SLOT_PRESETS.hero.sizes).toBe('(min-width:1512px) 800px, (min-width:961px) 55vw, 100vw')
    expect(SLOT_PRESETS.card.sizes).toBe('(min-width:1512px) 480px, (min-width:961px) 33vw, 100vw')
    expect(SLOT_PRESETS.gallery.sizes).toBe('(min-width:961px) 20vw, 50vw')
    expect(SLOT_PRESETS.eventHero.ratio).toBe('4:3')
    for (const preset of Object.values(SLOT_PRESETS)) {
      expect(preset.sizes.length).toBeGreaterThan(0)
      expect(ASPECT_RATIOS).toContain(preset.ratio)
    }
  })
  it('has a literal Tailwind class per ratio (no arbitrary values)', () => {
    for (const ratio of ASPECT_RATIOS) expect(ASPECT_CLASS[ratio]).not.toContain('[')
  })
  it('picks the nearest ratio', () => {
    expect(nearestAspectRatio(1600, 1200)).toBe('4:3')
    expect(nearestAspectRatio(2400, 1600)).toBe('3:2')
    expect(nearestAspectRatio(2560, 1440)).toBe('16:9')
    expect(nearestAspectRatio(400, 400)).toBe('1:1')
    expect(nearestAspectRatio(800, 1000)).toBe('4:5')
    expect(nearestAspectRatio(0, 0)).toBe('4:3')
  })
})

describe('local placeholders', () => {
  it('has a committed PNG per ratio with the matching size and no remote reference', () => {
    for (const ratio of ASPECT_RATIOS) {
      const file = join(webRoot, 'public', PLACEHOLDER_SRC[ratio])
      expect(statSync(file).size).toBeGreaterThan(100)
      const png = readFileSync(file)
      expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
      expect(png.readUInt32BE(16)).toBe(PLACEHOLDER_SIZE[ratio].width)
      expect(png.readUInt32BE(20)).toBe(PLACEHOLDER_SIZE[ratio].height)
      expect(PLACEHOLDER_SIZE[ratio].width / PLACEHOLDER_SIZE[ratio].height).toBeCloseTo(ASPECT_RATIO_VALUE[ratio], 2)
    }
    expect(placeholderForSize(1000, 1000)).toBe(PLACEHOLDER_SRC['1:1'])
  })
  it('ships only raster files (SVG is disabled in next/image)', () => {
    const files = readdirSync(join(webRoot, 'public', 'placeholders'))
    expect(files.length).toBeGreaterThan(0)
    expect(files.every((name) => name.endsWith('.png'))).toBe(true)
  })
  it('keeps the blur constant a tiny PNG data URL that the media schema accepts', () => {
    expect(DEFAULT_BLUR_DATA_URL).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/)
    expect(DEFAULT_BLUR_DATA_URL.length).toBeLessThan(400)
  })
  it('keeps the generator palette equal to the theme tokens it copies', () => {
    const theme = readFileSync(join(webRoot, 'src', 'styles', 'theme.css'), 'utf8')
    const bytes = (token: string): string => {
      const hex = new RegExp(`--color-${token}:\\s*#([0-9a-f]{6});`, 'i').exec(theme)?.[1] ?? ''
      return `[${[0, 2, 4].map((i) => `0x${hex.slice(i, i + 2).toLowerCase()}`).join(', ')}]`
    }
    const script = readFileSync(join(webRoot, 'scripts', 'gen-placeholders.mjs'), 'utf8')
    expect(script).toContain(bytes('sand'))
    expect(script).toContain(bytes('paper-deep'))
  })
})

describe('no external image hosts in media sources', () => {
  it('has no Unsplash or Google URLs in the media module (CI guard, ASSET-INVENTORY 6.2)', () => {
    const dir = join(webRoot, 'src', 'components', 'ui', 'media')
    for (const name of readdirSync(dir)) {
      if (name.includes('.test.')) continue
      const text = readFileSync(join(dir, name), 'utf8')
      expect(text, name).not.toMatch(/https?:\/\/[^\s'"`]*(unsplash|googleusercontent|googleapis|gstatic)/i)
    }
  })
})
