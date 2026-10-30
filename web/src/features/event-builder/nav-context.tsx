'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { BuilderStep } from '@/lib/api/types/admin/event-builder'

interface BuilderNav {
  goToStep: (step: BuilderStep) => void
}
const NavContext = createContext<BuilderNav>({ goToStep: () => undefined })

export function BuilderNavProvider({
  goToStep,
  children,
}: {
  goToStep: (step: BuilderStep) => void
  children: ReactNode
}) {
  const value = useMemo(() => ({ goToStep }), [goToStep])
  return <NavContext value={value}>{children}</NavContext>
}

export function useBuilderNav(): BuilderNav {
  return useContext(NavContext)
}

/** Stable callback for step components that need to jump to another step (blocker deep links). */
export function useGoToStep(): (step: BuilderStep) => void {
  const { goToStep } = useBuilderNav()
  return useCallback(
    (step) => {
      goToStep(step)
    },
    [goToStep],
  )
}
