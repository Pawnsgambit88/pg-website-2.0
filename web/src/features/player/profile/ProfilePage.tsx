'use client'

import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Shell } from '@/components/layout/Shell'
import { PageIntro } from '@/components/ui/PageIntro'
import { Skeleton } from '@/components/ui/feedback/Skeleton'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import { profileQuery } from '@/lib/query/query-options/player'
import { PrivateAccountForm } from '@/features/player/profile/PrivateAccountForm'
import { PublicIdentityForm } from '@/features/player/profile/PublicIdentityForm'
import { createDirtyStore } from '@/features/player/shared/dirty-store'
import { QueryView } from '@/components/ui/feedback/QueryView'
import { UnsavedChangesGuard } from '@/features/player/shared/UnsavedChangesGuard'

/**
 * Profile (screen 31, TASK-068): private account and public chess identity as two separate panels with separate
 * saves. Each form starts from the loaded profile and is not reset by background refetches, so edits in progress are
 * never overwritten. The guard warns before unsaved edits are lost.
 */
export function ProfilePage() {
  const api = useApi()
  const query = useQuery(profileQuery(api))
  const [dirtyStore] = useState(createDirtyStore)
  return (
    <Shell className="flex flex-col gap-8 py-8 sm:py-12">
      <PageIntro
        eyebrow="Profile"
        title="Private by default. Social where you choose."
        description="Your account data and your public chess identity are deliberately separate."
      />
      <QueryView
        query={query}
        loadingLabel="Loading your profile"
        skeleton={
          <div className="flex flex-col gap-6">
            <Skeleton shape="card" className="h-96" />
            <Skeleton shape="card" className="h-64" />
          </div>
        }
        errorAction="load your profile"
        headingLevel={2}
      >
        {(profile) => (
          <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:items-start">
            <PrivateAccountForm profile={profile} dirtyStore={dirtyStore} />
            <PublicIdentityForm profile={profile} dirtyStore={dirtyStore} />
          </div>
        )}
      </QueryView>
      <UnsavedChangesGuard store={dirtyStore} />
    </Shell>
  )
}
