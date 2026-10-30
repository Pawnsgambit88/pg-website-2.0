import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { SiteSection, SiteSectionOf } from '@/lib/api/types/site-content'
import { tagsFor } from '@/lib/data/public/tags'
import { publicReadOpts } from '@/lib/preview/server'

// P01 CMS sections: home, community, nav, footer, meta (ARCH-001 9.3 `site:{section}`). The shared (public) layout reads
// `nav`, `footer` and `meta`; React.cache makes the layout, the page and generateMetadata share one upstream call.
// Failures throw (ARCH-001 7.6): a section is never replaced by empty content.

const loadSiteSection = cache(async (section: SiteSection) =>
  getPublicApi().getSiteContent(section, await publicReadOpts(tagsFor.site(section))),
)

/** One published site section, narrowed to its own shape by `key`. */
export function getSiteSection<K extends SiteSection>(section: K): Promise<SiteSectionOf<K>> {
  // React.cache erases the generic; the adapter already checked that the response's key equals `section`.
  return loadSiteSection(section) as Promise<SiteSectionOf<K>>
}
