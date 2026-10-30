import type { Metadata } from 'next'
import { routeMetadata } from '@/lib/routes/metadata'
import { RatingPage } from '@/features/player/rating/RatingPage'

export const metadata: Metadata = routeMetadata('rating')

export default function Page() {
  return <RatingPage />
}
