'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ChevronLeft } from '@/components/ui/icons/ChevronLeft'
import { ChevronRight } from '@/components/ui/icons/ChevronRight'
import { Pause } from '@/components/ui/icons/Pause'
import { Play } from '@/components/ui/icons/Play'
import { cn } from '@/lib/cn'
import { useLiveAnnouncer } from '@/lib/hooks/useLiveAnnouncer'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { clampAutoplayInterval, indexFromScroll, wrapIndex } from './carouselMath'

// CarouselControls (TASK-033): the interactive layer over the server-rendered scroll-snap track. It owns no markup for
// the slides; it finds the track by id and drives its scroll position. Loaded lazily by CarouselControlsLazy.
//
// Rules implemented here (ARCH-001 15, WCAG 2.2.2 / 2.1.1 / 2.5.8):
//  - autoplay never starts under prefers-reduced-motion; the interval is never below 5 s;
//  - autoplay pauses while the pointer hovers, focus is inside, or a finger is down; any real interaction
//    (button, dot, key, swipe) stops it for good; only the Play button restarts it;
//  - a Pause/Play button is present whenever the collection has autoplay on (and motion is allowed);
//  - slide changes are announced politely only when the user caused them, never by the timer;
//  - off-screen slides are `inert` + `aria-hidden`, so nothing inside them is tabbable or read.

const MAX_DOTS = 10

export interface CarouselControlsProps {
  regionId: string
  trackId: string
  count: number
  autoplay: boolean
  intervalMs: number
}

export function CarouselControls({ regionId, trackId, count, autoplay, intervalMs }: CarouselControlsProps) {
  const reduced = useReducedMotion()
  const announce = useLiveAnnouncer()
  const [index, setIndex] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touching, setTouching] = useState(false)

  const indexRef = useRef(0)
  const userScrollRef = useRef(false)
  const reducedRef = useRef(reduced)
  useEffect(() => {
    reducedRef.current = reduced
  }, [reduced])

  const getTrack = useCallback(() => document.getElementById(trackId), [trackId])

  const goTo = useCallback(
    (target: number, byUser: boolean) => {
      const track = getTrack()
      if (track === null) return
      const next = wrapIndex(target, count)
      if (byUser) {
        setStopped(true)
        announce(`Slide ${next + 1} of ${count}`)
      }
      indexRef.current = next
      setIndex(next)
      const dir = getComputedStyle(track).direction === 'rtl' ? -1 : 1
      track.scrollTo({ left: dir * next * track.clientWidth, behavior: reducedRef.current ? 'auto' : 'smooth' })
    },
    [announce, count, getTrack],
  )

  // Follow native swipe/scroll; announce only when the user (not the timer) moved the track.
  useEffect(() => {
    const track = getTrack()
    if (track === null) return undefined
    let frame = 0
    let settle = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = indexFromScroll(track.scrollLeft, track.clientWidth, count)
        if (next === indexRef.current) return
        indexRef.current = next
        setIndex(next)
        if (userScrollRef.current) {
          setStopped(true)
          announce(`Slide ${next + 1} of ${count}`)
        }
      })
    }
    const markUser = () => {
      userScrollRef.current = true
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        userScrollRef.current = false
      }, 1000)
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    track.addEventListener('wheel', markUser, { passive: true })
    track.addEventListener('pointerdown', markUser, { passive: true })
    track.addEventListener('touchstart', markUser, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      track.removeEventListener('scroll', onScroll)
      track.removeEventListener('wheel', markUser)
      track.removeEventListener('pointerdown', markUser)
      track.removeEventListener('touchstart', markUser)
    }
  }, [announce, count, getTrack])

  // Off-screen slides: inert (not tabbable, not clickable) and hidden from the accessibility tree.
  useEffect(() => {
    const track = getTrack()
    if (track === null) return
    track.querySelectorAll<HTMLElement>('[data-carousel-slide]').forEach((slide, i) => {
      const active = i === index
      slide.inert = !active
      if (active) slide.removeAttribute('aria-hidden')
      else slide.setAttribute('aria-hidden', 'true')
    })
  }, [getTrack, index])

  // Keyboard on the focused carousel, plus hover/focus/touch pause. Listeners live on the server-rendered region.
  useEffect(() => {
    const region = document.getElementById(regionId)
    if (region === null) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
      const rtl = getComputedStyle(region).direction === 'rtl'
      const current = indexRef.current
      let target: number | null = null
      if (event.key === 'ArrowRight') target = current + (rtl ? -1 : 1)
      else if (event.key === 'ArrowLeft') target = current + (rtl ? 1 : -1)
      else if (event.key === 'Home') target = 0
      else if (event.key === 'End') target = count - 1
      if (target === null) return
      event.preventDefault()
      goTo(target, true)
    }
    const onMouseEnter = () => setHovered(true)
    const onMouseLeave = () => setHovered(false)
    const onFocusIn = () => setFocused(true)
    const onFocusOut = (event: FocusEvent) => {
      if (!(event.relatedTarget instanceof Node) || !region.contains(event.relatedTarget)) setFocused(false)
    }
    const onTouchStart = () => {
      setTouching(true)
      setStopped(true)
    }
    const onTouchEnd = () => setTouching(false)
    region.addEventListener('keydown', onKeyDown)
    region.addEventListener('mouseenter', onMouseEnter)
    region.addEventListener('mouseleave', onMouseLeave)
    region.addEventListener('focusin', onFocusIn)
    region.addEventListener('focusout', onFocusOut)
    region.addEventListener('touchstart', onTouchStart, { passive: true })
    region.addEventListener('touchend', onTouchEnd, { passive: true })
    region.addEventListener('touchcancel', onTouchEnd, { passive: true })
    return () => {
      region.removeEventListener('keydown', onKeyDown)
      region.removeEventListener('mouseenter', onMouseEnter)
      region.removeEventListener('mouseleave', onMouseLeave)
      region.removeEventListener('focusin', onFocusIn)
      region.removeEventListener('focusout', onFocusOut)
      region.removeEventListener('touchstart', onTouchStart)
      region.removeEventListener('touchend', onTouchEnd)
      region.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [count, goTo, regionId])

  const autoplayAvailable = autoplay && !reduced
  const running = autoplayAvailable && !stopped && !hovered && !focused && !touching

  useEffect(() => {
    if (!running) return undefined
    const timer = window.setInterval(() => {
      if (document.hidden) return
      goTo(indexRef.current + 1, false)
    }, clampAutoplayInterval(intervalMs))
    return () => window.clearInterval(timer)
  }, [goTo, intervalMs, running])

  const showDots = count <= MAX_DOTS
  const playing = autoplayAvailable && !stopped

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <Button variant="secondary" aria-label="Previous slide" onClick={() => goTo(index - 1, true)}>
          <ChevronLeft />
        </Button>
        <Button variant="secondary" aria-label="Next slide" onClick={() => goTo(index + 1, true)}>
          <ChevronRight />
        </Button>
        {autoplayAvailable ? (
          <Button
            variant="ghost"
            icon={playing ? <Pause /> : <Play />}
            aria-label={playing ? 'Pause automatic slide show' : 'Start automatic slide show'}
            onClick={() => setStopped(playing)}
          >
            {playing ? 'Pause' : 'Play'}
          </Button>
        ) : null}
      </div>
      <p className="m-0 font-mono text-label text-muted">
        Slide {index + 1} of {count}
      </p>
      {showDots ? (
        <ul className="m-0 flex list-none flex-wrap items-center p-0" aria-label="Choose a slide">
          {Array.from({ length: count }, (_, i) => (
            <li key={i} className="flex">
              <button
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                aria-controls={trackId}
                onClick={() => goTo(i, true)}
                className="flex size-11 items-center justify-center rounded-public"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-2.5 rounded-full border border-forest',
                    i === index ? 'bg-forest' : 'bg-transparent',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
