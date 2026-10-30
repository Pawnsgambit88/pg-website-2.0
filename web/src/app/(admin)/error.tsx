'use client'

import { RouteError } from '@/components/layout/RouteError'

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} area="this page" />
}
