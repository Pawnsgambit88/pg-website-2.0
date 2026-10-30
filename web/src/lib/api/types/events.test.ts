import { describe, expect, it } from 'vitest'
import { availabilitySchema, EVENT_STATUSES, eventStatusSchema, EVENT_TRANSITIONS } from '@/lib/api/types/event-state'
import { eventDetailSchema, eventSummarySchema } from '@/lib/api/types/event'
import { contentBlockSchema } from '@/lib/api/types/content-blocks'
import { mediaRefSchema } from '@/lib/api/types/media'
import { legalPageDtoSchema, sitemapEntrySchema } from '@/lib/api/types/legal-sitemap'
import { siteSectionDtoSchema } from '@/lib/api/types/site-content'
import { storyDetailSchema } from '@/lib/api/types/story'
import { testimonialSchema } from '@/lib/api/types/testimonial'
import { contactInputSchema } from '@/lib/api/types/contact'

const NOW = '2026-10-22T10:00:00+05:30'
const ID = '11111111-1111-4111-8111-111111111111'

const media = {
  src: '/placeholders/hero.jpg',
  alt: 'Players at a board',
  decorative: false,
  width: 1600,
  height: 900,
  focal: { x: 0.5, y: 0.4 },
}

const summary = {
  slug: 'saturday-social',
  title: 'Saturday Social',
  promise: 'Easy games. Good coffee. Stay for another.',
  type: 'social',
  audience: 'all_levels',
  status: 'registration_open',
  startsAt: '2026-10-24T17:00:00+05:30',
  endsAt: '2026-10-24T20:30:00+05:30',
  area: 'Jubilee Hills',
  city: 'Hyderabad',
  format: 'Social chess',
  price: { pricePaise: 29900, currency: 'INR' },
  rated: false,
  firstTimerCount: 7,
  placesLeftHint: 12,
  cover: media,
  archivePublished: false,
  version: 3,
}

const mediaCollection = { mode: 'static', autoplay: false, intervalMs: 5000, items: [media] }

const detail = {
  ...summary,
  description: 'A relaxed PG evening for newcomers, regulars and anyone who wants real-board chess.',
  venue: {
    area: 'Jubilee Hills',
    city: 'Hyderabad',
    venueName: 'Roastery Room',
    address: '12 Road No 36, Jubilee Hills',
  },
  experience: {
    eyebrow: 'The experience',
    heading: 'Walk in. We will take it from there.',
    body: 'A relaxed evening.',
    highlights: [{ title: 'Hosted arrival', body: 'If it is your first PG, someone knows.' }],
  },
  atAGlance: {
    format: 'Social chess',
    timeControl: 'Choose on the night',
    membershipRequired: false,
    hostedArrival: true,
  },
  pairingMode: 'social_balanced',
  rating: { rated: false },
  registration: { opensAt: null, closesAt: '2026-10-24T16:00:00+05:30', waitlistEnabled: true },
  logistics: ['Doors open at 4:30 PM'],
  faq: [{ question: 'What happens when I arrive?', answer: 'A host greets you by name.' }],
  media: mediaCollection,
  cancelled: null,
  archive: null,
  updatedAt: NOW,
}

describe('event summary and detail', () => {
  it('accepts a valid card and detail', () => {
    expect(eventSummarySchema.safeParse(summary).success).toBe(true)
    expect(eventDetailSchema.safeParse(detail).success).toBe(true)
  })

  it('requires a slug and rejects a bad one', () => {
    const withoutSlug = { ...summary, slug: undefined }
    expect(eventSummarySchema.safeParse(withoutSlug).success).toBe(false)
    expect(eventSummarySchema.safeParse({ ...summary, slug: 'Saturday Social' }).success).toBe(false)
    expect(eventSummarySchema.safeParse({ ...summary, slug: 'a'.repeat(101) }).success).toBe(false)
  })

  it('rejects negative, fractional and string paise', () => {
    for (const pricePaise of [-100, 299.5, '29900']) {
      expect(eventSummarySchema.safeParse({ ...summary, price: { pricePaise, currency: 'INR' } }).success).toBe(false)
    }
  })

  it('rejects a non-INR currency', () => {
    expect(eventSummarySchema.safeParse({ ...summary, price: { pricePaise: 100, currency: 'USD' } }).success).toBe(
      false,
    )
  })

  it('rejects an unknown status, type or audience enum', () => {
    expect(eventSummarySchema.safeParse({ ...summary, status: 'archived' }).success).toBe(false)
    expect(eventSummarySchema.safeParse({ ...summary, status: 'draft' }).success).toBe(false)
    expect(eventSummarySchema.safeParse({ ...summary, type: 'tournament' }).success).toBe(false)
    expect(eventSummarySchema.safeParse({ ...summary, audience: 'experts' }).success).toBe(false)
  })

  it('rejects an instant without an offset', () => {
    expect(eventSummarySchema.safeParse({ ...summary, startsAt: '2026-10-24T17:00:00' }).success).toBe(false)
  })

  it('rejects a focal point outside 0..1 on cover media', () => {
    expect(eventSummarySchema.safeParse({ ...summary, cover: { ...media, focal: { x: 1.5, y: 0.5 } } }).success).toBe(
      false,
    )
  })

  it('does not accept private or internal fields as extra data in the typed output', () => {
    const parsed = eventSummarySchema.parse({ ...summary, id: ID, organiserEmail: 'a@b.com' })
    expect(parsed).not.toHaveProperty('id')
    expect(parsed).not.toHaveProperty('organiserEmail')
  })

  it('a rated event must name its pool; an unrated one has none', () => {
    expect(eventDetailSchema.safeParse({ ...detail, rating: { rated: true } }).success).toBe(false)
    expect(eventDetailSchema.safeParse({ ...detail, rating: { rated: true, pool: 'rapid' } }).success).toBe(true)
  })

  it('knows the full event state machine', () => {
    expect(EVENT_STATUSES.every((status) => eventStatusSchema.safeParse(status).success)).toBe(true)
    expect(EVENT_TRANSITIONS.completed).toEqual([])
    expect(EVENT_TRANSITIONS.draft).toEqual(['published'])
  })
})

describe('media ref', () => {
  it('requires alt unless decorative', () => {
    expect(mediaRefSchema.safeParse({ ...media, alt: '' }).success).toBe(false)
    expect(mediaRefSchema.safeParse({ ...media, decorative: true, alt: '' }).success).toBe(true)
    expect(mediaRefSchema.safeParse({ ...media, decorative: true, alt: 'text' }).success).toBe(false)
  })
  it('rejects javascript: and data: sources', () => {
    expect(mediaRefSchema.safeParse({ ...media, src: 'javascript:alert(1)' }).success).toBe(false)
    expect(mediaRefSchema.safeParse({ ...media, src: 'data:image/svg+xml;base64,AAAA' }).success).toBe(false)
  })
})

describe('availability', () => {
  const base = { serverNow: NOW }
  it('accepts each coherent state', () => {
    expect(availabilitySchema.safeParse({ ...base, state: 'open', placesLeft: 12, waitlistOpen: false }).success).toBe(
      true,
    )
    expect(
      availabilitySchema.safeParse({ ...base, state: 'full_waitlist', placesLeft: 0, waitlistOpen: true }).success,
    ).toBe(true)
    expect(
      availabilitySchema.safeParse({ ...base, state: 'sold_out', placesLeft: 0, waitlistOpen: false }).success,
    ).toBe(true)
    expect(availabilitySchema.safeParse({ ...base, state: 'closed', placesLeft: 3, waitlistOpen: false }).success).toBe(
      true,
    )
  })
  it('rejects contradictions and unknown states', () => {
    expect(availabilitySchema.safeParse({ ...base, state: 'open', placesLeft: 0, waitlistOpen: false }).success).toBe(
      false,
    )
    expect(
      availabilitySchema.safeParse({ ...base, state: 'sold_out', placesLeft: 4, waitlistOpen: false }).success,
    ).toBe(false)
    expect(
      availabilitySchema.safeParse({ ...base, state: 'full_waitlist', placesLeft: 0, waitlistOpen: false }).success,
    ).toBe(false)
    expect(availabilitySchema.safeParse({ ...base, state: 'maybe', placesLeft: 1, waitlistOpen: false }).success).toBe(
      false,
    )
    expect(availabilitySchema.safeParse({ state: 'open', placesLeft: 1, waitlistOpen: false }).success).toBe(false)
  })
})

describe('stories and content blocks', () => {
  const story = {
    slug: 'the-best-clubs',
    kind: 'club_notes',
    title: 'The best chess clubs are not really about chess.',
    dek: 'What happens between the games.',
    publishedOn: '2026-09-01',
    readingMinutes: 4,
    featured: true,
    cover: media,
    version: 2,
    eyebrow: 'Club notes',
    body: [
      { type: 'heading', level: 2, text: 'Why people return' },
      { type: 'paragraph', text: 'Plain text.' },
      { type: 'quote', text: 'A quote.', attribution: 'Meera' },
      { type: 'image', media, caption: 'The room' },
      { type: 'list', ordered: false, items: ['One', 'Two'] },
      { type: 'link', label: 'Play', href: '/play' },
    ],
    updatedAt: NOW,
  }

  it('accepts a story using every block type', () => {
    expect(storyDetailSchema.safeParse(story).success).toBe(true)
  })
  it('rejects unknown block types, HTML-ish types and unsafe links', () => {
    expect(contentBlockSchema.safeParse({ type: 'html', html: '<b>x</b>' }).success).toBe(false)
    expect(contentBlockSchema.safeParse({ type: 'link', label: 'x', href: 'javascript:alert(1)' }).success).toBe(false)
    expect(contentBlockSchema.safeParse({ type: 'heading', level: 1, text: 'x' }).success).toBe(false)
    expect(contentBlockSchema.safeParse({ type: 'list', ordered: true, items: [] }).success).toBe(false)
  })
  it('requires a slug and a known kind', () => {
    expect(storyDetailSchema.safeParse({ ...story, slug: 'Bad Slug' }).success).toBe(false)
    expect(storyDetailSchema.safeParse({ ...story, kind: 'ads' }).success).toBe(false)
  })
})

describe('testimonial', () => {
  const testimonial = {
    id: ID,
    quote: 'Exact words.',
    name: 'Meera Joshi',
    descriptor: 'Weekend regular',
    portrait: media,
  }
  it('accepts a public-safe testimonial and drops admin fields', () => {
    const parsed = testimonialSchema.parse({ ...testimonial, consentAt: NOW, sortOrder: 1 })
    expect(parsed).not.toHaveProperty('consentAt')
    expect(parsed).not.toHaveProperty('sortOrder')
  })
  it('requires a portrait and a quote', () => {
    const noPhoto = { ...testimonial, portrait: undefined }
    expect(testimonialSchema.safeParse(noPhoto).success).toBe(false)
    expect(testimonialSchema.safeParse({ ...testimonial, quote: '' }).success).toBe(false)
  })
})

describe('site content, legal and sitemap', () => {
  it('discriminates sections by key', () => {
    const nav = {
      key: 'nav',
      version: 1,
      updatedAt: NOW,
      content: {
        primary: [{ label: 'Play', href: '/play' }],
        authCta: { label: 'Find my next game', href: '/play' },
      },
    }
    expect(siteSectionDtoSchema.safeParse(nav).success).toBe(true)
    expect(siteSectionDtoSchema.safeParse({ ...nav, key: 'unknown' }).success).toBe(false)
    expect(siteSectionDtoSchema.safeParse({ ...nav, content: { primary: [] } }).success).toBe(false)
  })
  it('rejects unsafe social links in the footer', () => {
    const footer = (href: string) => ({
      key: 'footer',
      version: 1,
      updatedAt: NOW,
      content: { tagline: 'Good games.', links: [], social: [{ label: 'X', href }], legalNote: null },
    })
    expect(siteSectionDtoSchema.safeParse(footer('https://example.com/pg')).success).toBe(true)
    expect(siteSectionDtoSchema.safeParse(footer('javascript:alert(1)')).success).toBe(false)
  })
  it('legal page requires a date-only effective date', () => {
    const legal = {
      page: 'privacy',
      title: 'Privacy Policy',
      blocks: [{ type: 'paragraph', text: 'x' }],
      effectiveDate: '2026-10-19',
      version: 1,
    }
    expect(legalPageDtoSchema.safeParse(legal).success).toBe(true)
    expect(legalPageDtoSchema.safeParse({ ...legal, effectiveDate: '19 October 2026' }).success).toBe(false)
    expect(legalPageDtoSchema.safeParse({ ...legal, page: 'cookies' }).success).toBe(false)
  })
  it('sitemap entries carry slug or path', () => {
    expect(
      sitemapEntrySchema.safeParse({ type: 'event', slug: 'monsoon-open', updatedAt: NOW, cancelled: false }).success,
    ).toBe(true)
    expect(sitemapEntrySchema.safeParse({ type: 'page', path: '/play', updatedAt: NOW }).success).toBe(true)
    expect(sitemapEntrySchema.safeParse({ type: 'event', path: '/play', updatedAt: NOW }).success).toBe(false)
  })
})

describe('contact', () => {
  const valid = { name: 'Kiran', email: 'kiran@example.com', topic: 'joining_event', message: 'Hello there' }
  it('accepts a valid message and rejects bad ones', () => {
    expect(contactInputSchema.safeParse(valid).success).toBe(true)
    expect(contactInputSchema.safeParse({ ...valid, email: 'nope' }).success).toBe(false)
    expect(contactInputSchema.safeParse({ ...valid, topic: 'spam' }).success).toBe(false)
    expect(contactInputSchema.safeParse({ ...valid, message: '   ' }).success).toBe(false)
  })
})
