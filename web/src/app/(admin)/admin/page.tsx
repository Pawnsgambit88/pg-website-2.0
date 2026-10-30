import type { Metadata } from 'next'
import { AdminDashboard } from '@/features/admin/dashboard/AdminDashboard'
import { routeMetadata } from '@/lib/routes/metadata'

export const metadata: Metadata = routeMetadata('admin-home')

export default function Page() {
  return <AdminDashboard />
}
