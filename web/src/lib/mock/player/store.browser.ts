'use client'

import { initialPlayerState, parsePlayerState, type PlayerState, type PlayerStateStore } from '@/lib/mock/player/state'
import { parseScenarioTokens, type MockScenario } from '@/lib/mock/scenario'
import { defineStore } from '@/lib/storage/versioned'

// Session storage for the mock player data (TASK-019): sessionStorage `pg:mock:v1:player` through lib/storage/versioned.ts.
// Nothing is cached in memory: every read parses storage (or rebuilds the empty state), every write replaces it.
// The scenario switcher lives here: a `?mock=room:live` style value in the URL is applied on read and remembered for the
// session, so it also survives client-side navigation to routes without the query.

const SUFFIX = 'player'

const store = defineStore<PlayerState>({ area: 'session', name: 'mock', version: 1, parse: parsePlayerState })

/** The URL scenario wins and is remembered; `?mock=reset` clears every player change and scenario. */
function applyUrlScenario(state: PlayerState): PlayerState {
  if (typeof window === 'undefined') return state
  const fromUrl = parseScenarioTokens(new URLSearchParams(window.location.search).get('mock'))
  if (fromUrl === null) return state
  const same = JSON.stringify(fromUrl) === JSON.stringify(state.scenario)
  if (same) return state
  const next = Object.keys(fromUrl).length === 0 ? initialPlayerState() : { ...state, scenario: fromUrl }
  store.write(next, SUFFIX)
  return next
}

export function createSessionPlayerStore(): PlayerStateStore {
  return {
    read: () => applyUrlScenario(store.read(SUFFIX) ?? initialPlayerState()),
    write: (state) => {
      store.write(state, SUFFIX)
    },
  }
}

/** For a dev panel or a test: force the scenario (merged over the current one) without touching the URL. */
export function setMockScenario(scenario: MockScenario): void {
  const state = store.read(SUFFIX) ?? initialPlayerState()
  store.write({ ...state, scenario: { ...state.scenario, ...scenario } }, SUFFIX)
}

/** Back to natural states and the seeded registrations. */
export function resetMockScenario(): void {
  store.remove(SUFFIX)
}

export function readMockScenario(): MockScenario {
  return (store.read(SUFFIX) ?? initialPlayerState()).scenario
}
