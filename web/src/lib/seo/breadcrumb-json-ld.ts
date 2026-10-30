// schema.org BreadcrumbList (TASK-112: event pages; story pages may reuse it). Pure, no directive.
import type { JsonLdObject } from '@/lib/seo/serialize-json-ld'
import { canonicalUrl } from '@/lib/seo/site'

export interface Crumb {
  name: string
  /** Same-origin route path, for example `/play`. */
  path: string
}

/** BreadcrumbList with absolute item URLs, positions from 1. Empty input gives an empty list (caller should skip it). */
export function breadcrumbJsonLd(crumbs: readonly Crumb[]): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonicalUrl(crumb.path),
    })),
  }
}
