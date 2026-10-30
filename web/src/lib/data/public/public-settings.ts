import 'server-only'
import { cache } from 'react'
import { getPublicApi } from '@/lib/api/adapters/getPublicApi.server'
import type { PublicSettingsDto } from '@/lib/api/types/site-content'
import { PUBLIC_REVALIDATE_SECONDS } from '@/lib/data/public/cache-policy'
import { tagsFor } from '@/lib/data/public/tags'

// P12 (inferred) non-secret contact configuration: support email, desk contact link, social links (Contact page,
// event detail "Message event desk"). Carries `site:meta` (see tags.ts: ARCH-001 9.3 defines no settings tag).

export const getPublicSettings = cache(
  (): Promise<PublicSettingsDto> =>
    getPublicApi().getPublicSettings({ tags: tagsFor.publicSettings(), revalidate: PUBLIC_REVALIDATE_SECONDS }),
)
