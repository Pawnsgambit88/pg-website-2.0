'use client'

import { createContext } from 'react'
import type { AuthActions } from '@/features/auth/auth-controller'
import type { AuthStore } from '@/features/auth/auth-store'

// Split contexts (ARCH-001 12.6; RBP rerender-defer-reads). Both values are created once per AuthProvider and never
// change, so no consumer re-renders because a context value changed. State is read from the store through selectors
// (useAuth.ts); a component that only calls `logout` subscribes to nothing.

export const AuthStoreContext = createContext<AuthStore | null>(null)
AuthStoreContext.displayName = 'AuthStore'

export const AuthActionsContext = createContext<AuthActions | null>(null)
AuthActionsContext.displayName = 'AuthActions'
