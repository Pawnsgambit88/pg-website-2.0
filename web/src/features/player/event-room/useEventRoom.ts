'use client'

import { useEffect, useRef } from 'react'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { useLiveAnnouncer } from '@/lib/hooks/useLiveAnnouncer'
import { usePolling } from '@/lib/query/polling'
import { eventRoomQuery } from '@/lib/query/query-options/player'
import { announcementFor, pollIntervalMs, type RoomSnapshot } from '@/features/player/event-room/room-state'

/**
 * Version marker as change detection (contract OD-06): a poll that returns the same `version` and `roomState` keeps the
 * previous object, so nothing downstream re-renders just because `serverNow` moved. A different version falls through
 * to TanStack's structural sharing (unchanged subtrees keep identity). Screens therefore never show a live clock; they
 * show server-given times only.
 */
function keepWhenVersionUnchanged(oldData: unknown, newData: unknown): unknown {
  const before = oldData as RoomSnapshot | undefined
  const after = newData as RoomSnapshot
  if (before !== undefined && before.version === after.version && before.roomState === after.roomState) return before
  return after
}

/**
 * The Event Room snapshot (M05) for one event: ONE query key (`qk.eventRoom(eventId)`) shared by every component that
 * reads the room, so the screen, the header and the mutations all use one cache entry and one in-flight request.
 *
 * Polling (usePolling): idle 30 s; 10 s while check-in is open, 5 s while pairing is pending or between rounds, 15 s in
 * a live round (8 s once a result waits for someone), 15 s while the rating update is processing. Paused while the tab is
 * hidden or the browser is offline; resumes with an immediate refetch. A 4xx stops polling. `refresh()` is the manual
 * refresh and works while paused.
 *
 * Announcements: when the room changes in a way the player cares about (check-in opened, pairing published, round
 * finished, result to confirm) ONE short sentence goes to the polite live region. A poll with no real change is silent.
 */
export function useEventRoom(eventId: string) {
  const api = useApi()
  const announce = useLiveAnnouncer()
  const polling = usePolling(
    { ...eventRoomQuery(api, eventId), structuralSharing: keepWhenVersionUnchanged },
    { intervalMs: (data) => pollIntervalMs(data) },
  )

  const { data } = polling
  const previous = useRef<RoomSnapshot | undefined>(undefined)
  useEffect(() => {
    if (data === undefined) return
    const text = announcementFor(previous.current, data)
    previous.current = data
    if (text !== null) announce(text)
  }, [data, announce])

  return polling
}
