import type { Route } from 'next'
import { notFound, redirect } from 'next/navigation'
import { isValidEntityId } from '@/lib/routes/params'

// Index of the Control Room: redirects to the overview tab (FEAT-001 "routes outside the 59").
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isValidEntityId(id)) notFound()
  redirect(`/admin/events/${encodeURIComponent(id)}/overview` as Route)
}
