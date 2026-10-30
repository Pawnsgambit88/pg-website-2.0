'use client'

import dynamic from 'next/dynamic'
import type { CarouselControlsProps } from './CarouselControls'

// The interactive controller is a separate chunk: pages whose carousel has 0 or 1 items never load it, and the first
// slide never waits for it. `ssr: false` is only allowed in a Client Component, hence this tiny wrapper.
const CarouselControls = dynamic(() => import('./CarouselControls').then((m) => m.CarouselControls), { ssr: false })

export function CarouselControlsLazy(props: CarouselControlsProps) {
  return <CarouselControls {...props} />
}
