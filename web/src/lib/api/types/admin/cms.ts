import { z } from 'zod'
import { adminActorSchema, lastChangeSchema, writeVersionSchema } from '@/lib/api/types/admin/common'
import { contentBlocksSchema } from '@/lib/api/types/content-blocks'
import { isoDateSchema, isoInstantSchema, plainText, versionSchema } from '@/lib/api/types/primitives'
import { legalPageSchema } from '@/lib/api/types/legal-sitemap'
import { siteSectionDtoSchema, siteSectionSchema } from '@/lib/api/types/site-content'

// Website CMS (contract S01 to S06, screen 33; CMS-SPEC; STATE-MACHINES "CMS page/story").
// Typed content only: the editable payload of a section IS the public section content, so the draft is parsed with the
// same schema as the published copy and cannot carry HTML or free-form layout. Slugs do not exist here: sections use fixed
// keys. Saving a draft is separate from publishing; every write carries the `version` last read (F-ACMS-003).

/** Row status: `clean` has no unpublished edits, `draft` has edits not yet published, `published` is the never-edited published state. */
export const CMS_ROW_STATUSES = ['clean', 'draft', 'published'] as const
export const cmsRowStatusSchema = z.enum(CMS_ROW_STATUSES)
export type CmsRowStatus = z.infer<typeof cmsRowStatusSchema>

/** `GET /admin/cms/sections` (S01), bounded. */
export const cmsSectionRowSchema = z.object({
  key: siteSectionSchema,
  status: cmsRowStatusSchema,
  version: versionSchema,
  updatedAt: isoInstantSchema,
  updatedBy: adminActorSchema.nullable(),
})
export type CmsSectionRow = z.infer<typeof cmsSectionRowSchema>

/** One side of the side-by-side view: the section payload exactly as the public site reads it. */
export const cmsContentSchema = siteSectionDtoSchema
export type CmsContent = z.infer<typeof cmsContentSchema>

/**
 * `GET /admin/cms/sections/{key}` (S02): draft and published copies side by side. `draft` is null when there are no
 * unpublished edits (`status: 'clean'`). `version` is the token to send with the next write.
 */
export const cmsSectionSchema = z.object({
  key: siteSectionSchema,
  status: cmsRowStatusSchema,
  published: cmsContentSchema.nullable(),
  draft: cmsContentSchema.nullable(),
  version: versionSchema,
  updatedAt: isoInstantSchema,
  lastChange: lastChangeSchema.nullable(),
})
export type CmsSectionDto = z.infer<typeof cmsSectionSchema>

/**
 * `PUT /admin/cms/sections/{key}/draft` (S03). `content` is the typed section payload for that key. A stale `version`
 * fails with VERSION_CONFLICT; the UI re-reads the section and shows `lastChange` (the error body has no slot for it).
 */
const [homeSection, communitySection, navSection, footerSection, metaSection] = siteSectionDtoSchema.options
const draftBody = <K extends z.ZodLiteral<string>, C extends z.ZodType>(key: K, content: C) =>
  z.strictObject({ key, version: writeVersionSchema, content })

/**
 * Discriminated on `key`, so the content shape must match the section being saved. The adapter takes `key` for the path
 * and sends `{ version, content }` as the body.
 */
export const saveCmsDraftSchema = z.discriminatedUnion('key', [
  draftBody(homeSection.shape.key, homeSection.shape.content),
  draftBody(communitySection.shape.key, communitySection.shape.content),
  draftBody(navSection.shape.key, navSection.shape.content),
  draftBody(footerSection.shape.key, footerSection.shape.content),
  draftBody(metaSection.shape.key, metaSection.shape.content),
])
export type SaveCmsDraftInput = z.infer<typeof saveCmsDraftSchema>

/** S03 response: saved but NOT published (UI-STATES "save successful but not published"). */
export const saveCmsDraftResultSchema = z.object({
  key: siteSectionSchema,
  status: z.literal('draft'),
  version: versionSchema,
  savedAt: isoInstantSchema,
})
export type SaveCmsDraftResult = z.infer<typeof saveCmsDraftResultSchema>

/** `POST /admin/cms/sections/{key}/publish` (S04). IK required. Publishes the saved draft at `version`. */
export const publishCmsSectionSchema = z.strictObject({ version: writeVersionSchema })
export type PublishCmsSectionInput = z.infer<typeof publishCmsSectionSchema>

export const publishCmsResultSchema = z.object({
  key: siteSectionSchema,
  status: z.literal('published'), // the backend answers `published` (S04); the row status afterwards is read with S02
  version: versionSchema,
  publishedAt: isoInstantSchema,
})
export type PublishCmsResult = z.infer<typeof publishCmsResultSchema>

/** `GET /admin/cms/sections/{key}/versions` (S05): basic history list. Bounded and paged. */
export const cmsVersionEntrySchema = z.object({
  version: versionSchema,
  publishedAt: isoInstantSchema,
  publishedBy: adminActorSchema,
  summary: plainText(300).nullable(),
})
export type CmsVersionEntry = z.infer<typeof cmsVersionEntrySchema>

// ---------- Legal pages (S06) ----------

/** Legal page for editing. Production publish needs approved wording (FEAT-001 OQ-04, a process gate, not a type rule). */
export const legalDraftSchema = z.object({
  page: legalPageSchema,
  title: plainText(120),
  blocks: contentBlocksSchema,
  effectiveDate: isoDateSchema,
})
export type LegalDraft = z.infer<typeof legalDraftSchema>

export const adminLegalPageSchema = z.object({
  page: legalPageSchema,
  status: cmsRowStatusSchema,
  published: legalDraftSchema.nullable(),
  draft: legalDraftSchema.nullable(),
  version: versionSchema,
  updatedAt: isoInstantSchema,
  lastChange: lastChangeSchema.nullable(),
})
export type AdminLegalPageDto = z.infer<typeof adminLegalPageSchema>

/** `POST /admin/legal/{page}/publish` (S06). IK required. */
export const publishLegalResultSchema = z.object({
  page: legalPageSchema,
  status: z.literal('published'), // same wire value as S04
  version: versionSchema,
  publishedAt: isoInstantSchema,
})
export type PublishLegalResult = z.infer<typeof publishLegalResultSchema>

/** `PUT /admin/legal/{page}` body. */
export const saveLegalDraftSchema = z.strictObject({
  version: writeVersionSchema,
  title: z.string().trim().min(1).max(120),
  blocks: contentBlocksSchema,
  effectiveDate: isoDateSchema,
})
export type SaveLegalDraftInput = z.infer<typeof saveLegalDraftSchema>
