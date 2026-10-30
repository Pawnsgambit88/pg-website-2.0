// schema.org Organization and WebSite nodes (TASK-112; HOME-PAGE-PLAN section 8). Pure, no directive.
// Home renders both through <JsonLd>; Event and Article reuse organizationRef() as organizer / publisher.
import type { JsonLdObject } from '@/lib/seo/serialize-json-ld'
import { absoluteUrl, canonicalUrl, SITE_NAME } from '@/lib/seo/site'

const CONTEXT = 'https://schema.org'

export interface OrganizationInput {
  /** Brand mark URL (same-origin path or https). No committed asset exists yet (ASSET-INVENTORY); omitted when absent. */
  logo?: string | null | undefined
  /** Public profiles (social links from PublicSettingsDto). Only https URLs are kept. */
  sameAs?: readonly string[] | undefined
}

/** The nested Organization used as `organizer` / `publisher` / `author` (no `@context`). */
export function organizationRef(): JsonLdObject {
  return { '@type': 'Organization', name: SITE_NAME, url: canonicalUrl('/') }
}

/** Top-level Organization node for Home. */
export function organizationJsonLd(input: OrganizationInput = {}): JsonLdObject {
  const logo = input.logo === null || input.logo === undefined ? null : absoluteUrl(input.logo)
  const sameAs = (input.sameAs ?? []).filter((href) => href.startsWith('https://') && absoluteUrl(href) !== null)
  return {
    '@context': CONTEXT,
    ...organizationRef(),
    ...(logo === null ? {} : { logo }),
    ...(sameAs.length === 0 ? {} : { sameAs }),
  }
}

/** Top-level WebSite node for Home. No SearchAction: the site has no search results URL. */
export function webSiteJsonLd(): JsonLdObject {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: canonicalUrl('/'),
    inLanguage: 'en-IN',
    publisher: organizationRef(),
  }
}
