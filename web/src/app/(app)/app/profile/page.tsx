import type { Metadata } from 'next'
import { routeMetadata } from '@/lib/routes/metadata'
import { ProfilePage } from '@/features/player/profile/ProfilePage'

export const metadata: Metadata = routeMetadata('profile')

export default function Page() {
  return <ProfilePage />
}
