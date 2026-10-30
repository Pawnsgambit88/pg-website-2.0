import { ImageResponse } from 'next/og'
import { BRAND_PALETTE } from '@/lib/seo/brand-palette.server'
import { DEFAULT_OG_IMAGE_ALT, OG_IMAGE_SIZE, SITE_NAME } from '@/lib/seo/site'

// Default brand share card, /opengraph-image (TASK-112, ARCH-001 8.3). Prerendered at build (no data, no request APIs),
// 1200x630 PNG. Pages built with lib/seo/metadata reference it when they have no image of their own.
//
// No external fonts or images are fetched. FONT: no TTF/OTF is committed yet (WOFF2 is not accepted by the generator,
// ASSET-INVENTORY AR-12), so the card uses next/og's bundled default face; brand faces (Newsreader, Anek Latin) need
// committed TTF files read once at module scope (RBP server-hoist-static-io). Colours come from theme.css tokens.
export const alt = DEFAULT_OG_IMAGE_ALT
export const size = { width: OG_IMAGE_SIZE.width, height: OG_IMAGE_SIZE.height }
export const contentType = 'image/png'

const TAGLINE = 'Social chess in Hyderabad'

export default function OpengraphImage() {
  const palette = BRAND_PALETTE
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        backgroundColor: palette.forest,
        color: palette.parchment,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            border: `4px solid ${palette['copper-soft']}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            color: palette['copper-soft'],
          }}
        >
          PG
        </div>
        <div style={{ display: 'flex', fontSize: 28, letterSpacing: 4, color: palette['copper-soft'] }}>
          {TAGLINE.toUpperCase()}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', fontSize: 120, lineHeight: 1.05, letterSpacing: -2 }}>{SITE_NAME}</div>
        <div style={{ display: 'flex', fontSize: 44, color: palette['parchment-soft'] }}>
          Good games. Better company.
        </div>
      </div>
      <div style={{ display: 'flex', height: 8, width: 160, backgroundColor: palette.copper }} />
    </div>,
    { ...size },
  )
}
