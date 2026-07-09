// Supabase Edge Function — runs Glicko-2 for a round and writes updated ratings
// Runs with service_role key so it can bypass RLS on the ratings table
// Deploy: supabase functions deploy update-ratings

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SCALE = 173.7178
const TAU = 0.5
const EPSILON = 0.000001

function g(phi: number) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI))
}

function E(mu: number, muj: number, phij: number) {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)))
}

function updateRating(
  player: { r: number; rd: number; volatility: number },
  results: { opponentRating: number; opponentRD: number; score: number }[]
) {
  if (!results.length) {
    const phi = player.rd / SCALE
    const newPhi = Math.sqrt(phi * phi + player.volatility * player.volatility)
    return { r: player.r, rd: Math.round(newPhi * SCALE), volatility: player.volatility }
  }

  const mu = (player.r - 1500) / SCALE
  const phi = player.rd / SCALE

  let v = 0
  for (const res of results) {
    const muj = (res.opponentRating - 1500) / SCALE
    const phij = res.opponentRD / SCALE
    const gj = g(phij)
    const Ej = E(mu, muj, phij)
    v += gj * gj * Ej * (1 - Ej)
  }
  v = 1 / v

  let delta = 0
  for (const res of results) {
    const muj = (res.opponentRating - 1500) / SCALE
    const phij = res.opponentRD / SCALE
    delta += g(phij) * (res.score - E(mu, muj, phij))
  }
  delta = v * delta

  const a = Math.log(player.volatility * player.volatility)
  const deltaSquared = delta * delta
  const phiSquared = phi * phi

  function f(x: number) {
    const ex = Math.exp(x)
    const d = phiSquared + v + ex
    return (ex * (deltaSquared - phiSquared - v - ex)) / (2 * d * d) - (x - a) / (TAU * TAU)
  }

  let A = a
  let B = deltaSquared > phiSquared + v
    ? Math.log(deltaSquared - phiSquared - v)
    : (() => { let k = 1; while (f(a - k * TAU) < 0) k++; return a - k * TAU })()

  let fA = f(A), fB = f(B)
  let iter = 0
  while (Math.abs(B - A) > EPSILON && iter++ < 500) {
    const C = A + ((A - B) * fA) / (fB - fA)
    const fC = f(C)
    if (fC * fB <= 0) { A = B; fA = fB } else { fA /= 2 }
    B = C; fB = fC
  }
  const newVolatility = Math.exp(A / 2)
  const phiStar = Math.sqrt(phiSquared + newVolatility * newVolatility)
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v)

  let newMu = mu
  for (const res of results) {
    const muj = (res.opponentRating - 1500) / SCALE
    const phij = res.opponentRD / SCALE
    newMu += newPhi * newPhi * g(phij) * (res.score - E(mu, muj, phij))
  }

  return {
    r: Math.round(SCALE * newMu + 1500),
    rd: Math.round(SCALE * newPhi),
    volatility: Math.round(newVolatility * 10000) / 10000,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { roundId, tournamentId } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get the tournament's time_control to know which rating bucket to update
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('time_control')
      .eq('id', tournamentId)
      .single()
    if (tErr) throw tErr
    const timeControl = tournament.time_control ?? 'rapid'

    // Fetch pairings for this round
    const { data: pairings, error: pErr } = await supabase
      .from('pairings')
      .select('player1_id, player2_id, result')
      .eq('round_id', roundId)
      .not('player1_id', 'is', null)
      .not('player2_id', 'is', null)
      .not('result', 'is', null)
    if (pErr) throw pErr

    // Fetch current ratings for the correct time_control bucket
    const playerIds = [...new Set(pairings.flatMap(p => [p.player1_id, p.player2_id]))]
    const { data: ratingsData, error: rErr } = await supabase
      .from('ratings')
      .select('user_id, rating, rd, volatility, games_played')
      .in('user_id', playerIds)
      .eq('time_control', timeControl)
    if (rErr) throw rErr

    const ratingMap = new Map(ratingsData.map(r => [r.user_id, r]))

    // Build results per player
    const resultsMap = new Map<string, { opponentRating: number; opponentRD: number; score: number }[]>()
    for (const p of pairings) {
      if (!resultsMap.has(p.player1_id)) resultsMap.set(p.player1_id, [])
      if (!resultsMap.has(p.player2_id)) resultsMap.set(p.player2_id, [])
      const r1 = ratingMap.get(p.player1_id)
      const r2 = ratingMap.get(p.player2_id)
      if (!r1 || !r2) continue
      resultsMap.get(p.player1_id)!.push({ opponentRating: r2.rating, opponentRD: r2.rd, score: p.result })
      resultsMap.get(p.player2_id)!.push({ opponentRating: r1.rating, opponentRD: r1.rd, score: 1 - p.result })
    }

    // Compute and write updates
    const updates: { userId: string; r: number; rd: number; volatility: number; delta: number }[] = []
    for (const userId of playerIds) {
      const current = ratingMap.get(userId)
      if (!current) continue
      const results = resultsMap.get(userId) ?? []
      const newRating = updateRating(
        { r: current.rating, rd: current.rd, volatility: current.volatility },
        results
      )

      await supabase
        .from('ratings')
        .update({
          rating: newRating.r,
          rd: newRating.rd,
          volatility: newRating.volatility,
          games_played: current.games_played + results.length,
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('time_control', timeControl)

      updates.push({ userId, ...newRating, delta: newRating.r - current.rating })
    }

    // Store rating_before / rating_after on each registration
    for (const { userId, r, delta } of updates) {
      const before = (ratingMap.get(userId)?.rating ?? r)
      await supabase
        .from('tournament_registrations')
        .update({ rating_before: before, rating_after: r })
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId)
    }

    // Mark round complete
    await supabase.from('tournament_rounds').update({ is_complete: true }).eq('id', roundId)

    return new Response(JSON.stringify({ success: true, updatedPlayers: updates.length, timeControl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
