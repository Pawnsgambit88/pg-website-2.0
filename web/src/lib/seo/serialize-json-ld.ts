// Safe JSON-LD serialiser (TASK-112, ARCH-001 8.2, 17.1; AC-13). Pure, no directive.
//
// The output is placed inside <script type="application/ld+json"> by components/seo/JsonLd. JSON.stringify alone is not
// safe there: a string value containing `</script>` closes the element, `<!--` changes the script data state, and
// U+2028 / U+2029 are line terminators in older JavaScript parsers. Every `<`, `>` and `&` and both separators are
// replaced by their six-character JSON unicode escape (backslash, `u`, four lowercase hex digits: u003c, u003e, u0026,
// u2028, u2029), which JSON parsers read back as the same characters. The escaped output never contains `<`, so no
// HTML tag or comment can start inside the script element.
//
// The characters are listed by code point and the escapes are computed, so the source holds no invisible characters
// and no escape sequence an editor or a string literal could collapse.

const UNSAFE_CODE_POINTS = [0x3c, 0x3e, 0x26, 0x2028, 0x2029] as const

const BACKSLASH = String.fromCharCode(0x5c)

const ESCAPES: ReadonlyMap<string, string> = new Map(
  UNSAFE_CODE_POINTS.map((code) => [String.fromCharCode(code), `${BACKSLASH}u${code.toString(16).padStart(4, '0')}`]),
)

const UNSAFE = new RegExp(`[${[...ESCAPES.keys()].join('')}]`, 'g')

/** JSON data only: what a JSON-LD node may hold. */
export type JsonLdValue =
  string | number | boolean | null | readonly JsonLdValue[] | { readonly [key: string]: JsonLdValue }

/** A JSON-LD node: a plain object with `@context` and `@type` (or a `@graph`). */
export type JsonLdObject = { readonly [key: string]: JsonLdValue }

/**
 * `JSON.stringify(data)`, then `<` `>` `&` U+2028 U+2029 replaced by their JSON unicode escapes (ARCH-001 8.2). The
 * result is valid JSON that parses back to the same value and is safe as the text of a script element.
 */
export function escapeJsonLd(data: JsonLdObject | readonly JsonLdObject[]): string {
  const json: unknown = JSON.stringify(data)
  // JSON.stringify returns undefined only for undefined, functions and symbols, which the type rules out.
  if (typeof json !== 'string') throw new Error('escapeJsonLd: data is not serialisable as JSON')
  return json.replace(UNSAFE, (char) => ESCAPES.get(char) ?? char)
}
