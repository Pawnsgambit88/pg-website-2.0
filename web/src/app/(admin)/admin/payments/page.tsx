import type { Metadata } from 'next'
import { PaymentsAdminPage } from '@/features/admin/payments/PaymentsAdminPage'
import { routeMetadata } from '@/lib/routes/metadata'

export const metadata: Metadata = routeMetadata('admin-payments')

export default function Page() {
  return <PaymentsAdminPage />
}
