// The single dangerouslySetInnerHTML site in the app (ARCH-001 M10, 8.2, 10.4, 17.1). eslint.config.mjs turns
// react/no-danger off for this file only (src/lib/seo/JsonLd.tsx), so the component lives here rather than under
// components/. It is a Server Component (no directive) and also renders inside client trees if ever needed.
//
// Safety: the text is produced only by escapeJsonLd, which escapes `<` `>` `&` U+2028 U+2029, so the payload cannot
// close the script element or open a comment. `application/ld+json` is a data block, never executed, so the public
// static CSP (`script-src 'self' 'unsafe-inline'`) and the client nonce CSP do not apply to it.
import { escapeJsonLd, type JsonLdObject } from '@/lib/seo/serialize-json-ld'

export interface JsonLdProps {
  /** One schema.org node or several. Build them with the lib/seo/*-json-ld helpers. */
  data: JsonLdObject | readonly JsonLdObject[]
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    // eslint-disable-next-line no-restricted-syntax -- the one reviewed data-block script (ARCH-001 8.2); not executable
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapeJsonLd(data) }} />
  )
}
