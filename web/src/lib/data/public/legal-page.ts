import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { LegalPage, LegalPageDto } from '@/lib/api/types/legal-sitemap'
import { tagsFor } from '@/lib/data/public/tags'
import { publicReadOpts } from '@/lib/preview/server'

// P09 legal pages: privacy, terms, refund-policy (static routes, so the page key is a typed literal, never a route
// param). Tag `legal:{page}` (ARCH-001 9.3). Throws on failure, including a 404: a legal page must exist.

export const getLegalPage = cache(
  async (page: LegalPage): Promise<LegalPageDto> =>
    getPublicApi().getLegalPage(page, await publicReadOpts(tagsFor.legal(page))),
)
