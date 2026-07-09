// Standard Glicko-2 implementation
// Reference: http://www.glicko.net/glicko/glicko2.pdf

const SCALE = 173.7178
const DEFAULT_VOLATILITY = 0.06
const TAU = 0.5 // system constant — constrains volatility change
const EPSILON = 0.000001

function g(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function E(mu, muj, phij) {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)))
}

function toGlicko2Scale(r, rd) {
  return {
    mu: (r - 1500) / SCALE,
    phi: rd / SCALE,
  }
}

function fromGlicko2Scale(mu, phi) {
  return {
    r: SCALE * mu + 1500,
    rd: SCALE * phi,
  }
}

// Update a single player's rating given their results in a period.
// results: array of { opponentRating, opponentRD, score } where score is 1, 0.5, or 0
export function updateRating(player, results) {
  const { r, rd, volatility = DEFAULT_VOLATILITY } = player

  // If no games played this period, increase uncertainty only
  if (!results || results.length === 0) {
    const { mu, phi } = toGlicko2Scale(r, rd)
    const newPhi = Math.sqrt(phi * phi + volatility * volatility)
    const out = fromGlicko2Scale(mu, newPhi)
    return { r: out.r, rd: out.rd, volatility }
  }

  const { mu, phi } = toGlicko2Scale(r, rd)

  // Step 3: compute v (estimated variance)
  let v = 0
  for (const res of results) {
    const { mu: muj, phi: phij } = toGlicko2Scale(res.opponentRating, res.opponentRD)
    const gj = g(phij)
    const Ej = E(mu, muj, phij)
    v += gj * gj * Ej * (1 - Ej)
  }
  v = 1 / v

  // Step 4: compute delta
  let delta = 0
  for (const res of results) {
    const { mu: muj, phi: phij } = toGlicko2Scale(res.opponentRating, res.opponentRD)
    const gj = g(phij)
    const Ej = E(mu, muj, phij)
    delta += gj * (res.score - Ej)
  }
  delta = v * delta

  // Step 5: update volatility (Illinois algorithm)
  const a = Math.log(volatility * volatility)
  const deltaSquared = delta * delta
  const phiSquared = phi * phi

  function f(x) {
    const ex = Math.exp(x)
    const d = phiSquared + v + ex
    return (
      (ex * (deltaSquared - phiSquared - v - ex)) / (2 * d * d) -
      (x - a) / (TAU * TAU)
    )
  }

  let A = a
  let B
  if (deltaSquared > phiSquared + v) {
    B = Math.log(deltaSquared - phiSquared - v)
  } else {
    let k = 1
    while (f(a - k * TAU) < 0) k++
    B = a - k * TAU
  }

  let fA = f(A)
  let fB = f(B)
  let iterations = 0
  while (Math.abs(B - A) > EPSILON && iterations < 500) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) {
      A = B
      fA = fB
    } else {
      fA = fA / 2
    }
    B = C
    fB = fC
    iterations++
  }
  const newVolatility = Math.exp(A / 2)

  // Step 6: update RD to phi*
  const phiStar = Math.sqrt(phiSquared + newVolatility * newVolatility)

  // Step 7: update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)
  let newMu = mu
  for (const res of results) {
    const { mu: muj, phi: phij } = toGlicko2Scale(res.opponentRating, res.opponentRD)
    newMu += newPhi * newPhi * g(phij) * (res.score - E(mu, muj, phij))
  }

  const out = fromGlicko2Scale(newMu, newPhi)
  return {
    r: Math.round(out.r),
    rd: Math.round(out.rd),
    volatility: Math.round(newVolatility * 10000) / 10000,
  }
}

// Compute rating updates for all players after a round.
// players: Map of userId -> { r, rd, volatility }
// pairings: array of { player1Id, player2Id, result } where result is 1=p1 wins, 0=p2 wins, 0.5=draw
export function computeRoundUpdates(players, pairings) {
  const resultsMap = new Map()

  for (const pairing of pairings) {
    const { player1Id, player2Id, result } = pairing
    const p1 = players.get(player1Id)
    const p2 = players.get(player2Id)
    if (!p1 || !p2) continue

    if (!resultsMap.has(player1Id)) resultsMap.set(player1Id, [])
    if (!resultsMap.has(player2Id)) resultsMap.set(player2Id, [])

    resultsMap.get(player1Id).push({ opponentRating: p2.r, opponentRD: p2.rd, score: result })
    resultsMap.get(player2Id).push({ opponentRating: p1.r, opponentRD: p1.rd, score: 1 - result })
  }

  const updates = new Map()
  for (const [userId, player] of players) {
    const results = resultsMap.get(userId) || []
    updates.set(userId, updateRating(player, results))
  }
  return updates
}

export const PROVISIONAL_RATINGS = {
  beginner: { r: 800, rd: 350, volatility: DEFAULT_VOLATILITY },
  intermediate: { r: 1100, rd: 300, volatility: DEFAULT_VOLATILITY },
  tournament: { r: 1400, rd: 250, volatility: DEFAULT_VOLATILITY },
  expert: { r: 1800, rd: 200, volatility: DEFAULT_VOLATILITY },
  titled: { r: 2200, rd: 150, volatility: DEFAULT_VOLATILITY },
}
