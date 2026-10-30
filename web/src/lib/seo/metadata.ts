// Page metadata builder (TASK-112, ARCH-001 8.1, 7.3 rule 5, 17.4). Pure, no directive: pages call it from
// `generateMetadata` (or a static `metadata` export) with data from the same React.cache fetcher the page uses.
//
// Next merges metadata SHALLOWLY per key: a page that sets `openGraph` replaces the parent's whole `openGraph`, images
// included. So the builder always emits complete `openGraph` and `twitter` objects, with the generated brand card
// (app/opengraph-image.tsx) as the image when the page has none. `title` is the page part only: the root layout template
// (`%s | Pawn's Gambit`) completes the document title, and the Open Graph / Twitter titles are completed here because
// the template does not reach them.
//
// Indexing comes from the route registry: a path that resolves to a `(public)` route that is not `noindex` gets
// `index, follow`; anything else (client groups, handoff, an unknown path) gets `noindex, nofollow`. A page may force
// noindex (draft preview, a page variant that must stay out of the index) but can never force a noindex route to index.
import type { Metadata } from 'next'
import { resolveRoute } from '@/lib/routes/resolve'
import {
  absoluteUrl,
  canonicalUrl,
  DEFAULT_OG_IMAGE_ALT,
  DEFAULT_OG_IMAGE_PATH,
  fullTitle,
  OG_IMAGE_SIZE,
  SITE_LOCALE,
  SITE_NAME,
} from '@/lib/seo/site'

export interface SeoImage {
  /** Same-origin path (`/placeholders/x.png`) or absolute https URL (storage host). Anything else is ignored. */
  src: string
  width: number
  height: number
  /** Empty for decorative media; the builder then falls back to the page title as the share-card alt. */
  alt: string
}

export interface ArticleTimes {
  /** ISO 8601 instant or date. */
  publishedTime?: string | undefined
  modifiedTime?: string | undefined
}

export interface BuildMetadataInput {
  /**
   * Page title without the site name ("Play", "Saturday Social"). The root template appends " | Pawn's Gambit".
   * `{ absolute }` is used as is (Home: "Pawn's Gambit | Social chess in Hyderabad").
   */
  title: string | { absolute: string }
  /** Meta description. Use metaDescription() from lib/seo/description to join and clamp it. Omitted when undefined. */
  description?: string | undefined
  /** Same-origin route path without query or fragment (`/`, `/events/saturday-social`). Becomes the canonical URL. */
  path: string
  /** Share image. Default: the generated brand card (app/opengraph-image.tsx). */
  image?: SeoImage | null | undefined
  /** Open Graph type. Default `website`; stories use `article`. */
  type?: 'website' | 'article' | undefined
  /** Article times for `type: 'article'`. */
  article?: ArticleTimes | undefined
  /** Force `noindex, nofollow` even on an indexable route (draft preview). Cannot make a noindex route indexable. */
  noindex?: boolean | undefined
}

/** True when `path` is served by an indexable `(public)` route in the registry (lib/routes/routes.ts). */
export function isIndexablePath(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0] ?? path
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  const route = resolveRoute(normalised === '' ? '/' : normalised)
  return route !== undefined && route.group === 'public' && !route.noindex
}

/** `robots` metadata: `index, follow` or `noindex, nofollow`. A fresh object per call (never shared module state). */
export function robotsFor(indexable: boolean): NonNullable<Metadata['robots']> {
  return indexable ? { index: true, follow: true } : { index: false, follow: false }
}

interface ResolvedImage {
  url: string
  width: number
  height: number
  alt: string
}

function resolveImage(image: SeoImage | null | undefined, fallbackAlt: string): ResolvedImage {
  const url = image === null || image === undefined ? null : absoluteUrl(image.src)
  if (image === null || image === undefined || url === null) {
    return {
      url: canonicalUrl(DEFAULT_OG_IMAGE_PATH),
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      alt: DEFAULT_OG_IMAGE_ALT,
    }
  }
  const alt = image.alt.trim()
  return { url, width: image.width, height: image.height, alt: alt === '' ? fallbackAlt : alt }
}

/**
 * Next `Metadata` for one page: title, description, `alternates.canonical` (absolute, from NEXT_PUBLIC_SITE_URL),
 * Open Graph (site name, locale en_IN, url, image), Twitter `summary_large_image`, and `robots` from the registry.
 */
export function buildMetadata(input: BuildMetadataInput): Metadata {
  const canonical = canonicalUrl(input.path)
  const socialTitle = typeof input.title === 'string' ? fullTitle(input.title) : input.title.absolute
  const image = resolveImage(input.image, socialTitle)
  const indexable = input.noindex !== true && isIndexablePath(input.path)
  const description = input.description

  const openGraphBase = {
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    url: canonical,
    title: socialTitle,
    ...(description === undefined ? {} : { description }),
    images: [{ url: image.url, width: image.width, height: image.height, alt: image.alt }],
  }

  const openGraph: NonNullable<Metadata['openGraph']> =
    input.type === 'article'
      ? {
          ...openGraphBase,
          type: 'article',
          ...(input.article?.publishedTime === undefined ? {} : { publishedTime: input.article.publishedTime }),
          ...(input.article?.modifiedTime === undefined ? {} : { modifiedTime: input.article.modifiedTime }),
        }
      : { ...openGraphBase, type: 'website' }

  return {
    title: typeof input.title === 'string' ? input.title : { absolute: input.title.absolute },
    ...(description === undefined ? {} : { description }),
    alternates: { canonical },
    openGraph,
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      ...(description === undefined ? {} : { description }),
      images: [{ url: image.url, alt: image.alt }],
    },
    robots: robotsFor(indexable),
  }
}
