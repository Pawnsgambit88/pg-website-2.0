/**
 * Motion tokens for the GSAP island (DEC-029 constraint 7). Framework-free and gsap-free: reads the same CSS custom
 * properties the CSS `reveal` utility uses (styles/theme.css), so the GSAP and CSS paths look identical. No second set
 * of magic numbers: every fallback below equals the token's current value and is used only when the token is missing
 * or unparsable.
 */

export interface MotionTokens {
  /** Seconds (gsap unit), from `--duration-reveal`. */
  duration: number
  /** Seconds, from `--duration-reveal-slow` (image scale settle). */
  durationSlow: number
  /** Seconds between stagger steps, half of `--duration-control` (same step as the `reveal-delay-*` utilities). */
  staggerStep: number
  /** Pixels, from `--reveal-distance`. */
  distance: number
  /** Start scale for `data-motion="scale"`, from `--reveal-scale` (no token yet; see FALLBACK). */
  scaleFrom: number
  /** Easing function equivalent to `--ease-brand` (a CSS cubic-bezier), usable as a gsap `ease`. */
  ease: (progress: number) => number
}

const FALLBACK = {
  duration: 0.6,
  durationSlow: 0.8,
  control: 0.2,
  distance: 16,
  // Subtle image settle. Replace with a `--reveal-scale` theme token (open point for the token owner).
  scaleFrom: 1.04,
  bezier: [0.2, 0.8, 0.2, 1] as const,
}

/** `600ms` / `0.6s` to seconds; `null` when unparsable or negative. */
export function parseDuration(value: string): number | null {
  const match = /^\s*(\d*\.?\d+)\s*(ms|s)\s*$/i.exec(value)
  const [, digits, unit] = match ?? []
  if (digits === undefined || unit === undefined) return null
  const amount = Number(digits)
  return unit.toLowerCase() === 'ms' ? amount / 1000 : amount
}

/** `16px` / `16` to a number of pixels; `null` otherwise (rem and calc are not resolved here). */
export function parsePixels(value: string): number | null {
  const match = /^\s*(-?\d*\.?\d+)\s*(px)?\s*$/i.exec(value)
  return match === null ? null : Number(match[1])
}

export function parseNumber(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const amount = Number(trimmed)
  return Number.isFinite(amount) ? amount : null
}

/** `cubic-bezier(x1, y1, x2, y2)` to its four control values; `null` otherwise. */
export function parseCubicBezier(value: string): [number, number, number, number] | null {
  const match = /^\s*cubic-bezier\(([^)]*)\)\s*$/i.exec(value)
  const args = match?.[1]
  if (args === undefined) return null
  const parts = args.split(',').map((part) => Number(part.trim()))
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return null
  const [x1, y1, x2, y2] = parts
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) return null
  // CSS requires x1 and x2 in [0, 1] so the curve is a function of time.
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null
  return [x1, y1, x2, y2]
}

/**
 * A CSS cubic-bezier timing function as a plain `(t) => value` ease (gsap core accepts a function ease; the
 * CustomEase plugin is not approved, DEC-029 constraint 4). Newton-Raphson with a bisection fallback, as browsers do.
 */
export function cubicBezierEase(x1: number, y1: number, x2: number, y2: number): (progress: number) => number {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const solveT = (x: number): number => {
    let t = x
    for (let i = 0; i < 8; i += 1) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return t
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= error / slope
    }
    let low = 0
    let high = 1
    t = x
    for (let i = 0; i < 30 && high - low > 1e-6; i += 1) {
      if (sampleX(t) < x) low = t
      else high = t
      t = (low + high) / 2
    }
    return t
  }

  return (progress: number) => {
    if (progress <= 0) return 0
    if (progress >= 1) return 1
    return sampleY(solveT(progress))
  }
}

/** Reads the motion tokens from the document root. Call in the browser only (inside an effect). */
export function readMotionTokens(root: Element): MotionTokens {
  const style = window.getComputedStyle(root)
  const read = (name: string) => style.getPropertyValue(name)
  const bezier = parseCubicBezier(read('--ease-brand')) ?? FALLBACK.bezier
  const control = parseDuration(read('--duration-control')) ?? FALLBACK.control
  return {
    duration: parseDuration(read('--duration-reveal')) ?? FALLBACK.duration,
    durationSlow: parseDuration(read('--duration-reveal-slow')) ?? FALLBACK.durationSlow,
    staggerStep: control * 0.5,
    distance: parsePixels(read('--reveal-distance')) ?? FALLBACK.distance,
    scaleFrom: parseNumber(read('--reveal-scale')) ?? FALLBACK.scaleFrom,
    ease: cubicBezierEase(bezier[0], bezier[1], bezier[2], bezier[3]),
  }
}
