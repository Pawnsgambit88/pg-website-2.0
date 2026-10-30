'use client'

import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ConfirmAction } from '@/components/admin/ConfirmAction'
import { FilterBar } from '@/components/admin/FilterBar'
import { Button } from '@/components/ui/Button'
import { Heading } from '@/components/ui/Heading'
import { Text } from '@/components/ui/Text'
import { Banner } from '@/components/ui/feedback/Banner'
import { EmptyState } from '@/components/ui/feedback/EmptyState'
import { ErrorState } from '@/components/ui/feedback/ErrorState'
import { SkeletonRegion } from '@/components/ui/feedback/SkeletonRegion'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { Select } from '@/components/ui/form/Select'
import { ResponsiveTable } from '@/components/ui/table/ResponsiveTable'
import { TableSkeleton } from '@/components/ui/table/TableSkeleton'
import { TablePagination } from '@/components/ui/table/TablePagination'
import { LEDGER_COLUMNS } from '@/features/admin/payments/payments-columns'
import { ORDER_STATE_LABEL } from '@/features/admin/payments/payments-labels'
import { RefundAction } from '@/features/admin/payments/RefundAction'
import { useApi } from '@/lib/api/adapters/useApi.browser'
import type { AdminLedgerRowDto, LedgerQuery, ReconcileResult } from '@/lib/api/types/admin/payments'
import { PAYMENT_ORDER_STATES, type PaymentOrderState } from '@/lib/api/types/payment'
import { formatEventDateTime } from '@/lib/format/date'
import { qk } from '@/lib/query/keys'
import { adminLedgerQuery } from '@/lib/query/query-options/admin'

const ALL = 'all'
const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: ALL, label: 'All statuses' },
  ...PAYMENT_ORDER_STATES.map((state) => ({ value: state, label: ORDER_STATE_LABEL[state] })),
]
const MISMATCH_OPTIONS = [
  { value: ALL, label: 'All payments' },
  { value: 'mismatch', label: 'Mismatches only' },
]

interface Filters {
  status: PaymentOrderState | typeof ALL
  mismatch: boolean
  from: string
  to: string
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

const NO_FILTERS: Filters = { status: ALL, mismatch: false, from: '', to: '' }

function toQuery(filters: Filters, page: number): LedgerQuery {
  return {
    page,
    pageSize: PAGE_SIZE,
    ...(filters.status === ALL ? {} : { status: filters.status }),
    ...(filters.mismatch ? { mismatch: true } : {}),
    ...(DATE.test(filters.from) ? { from: filters.from } : {}),
    ...(DATE.test(filters.to) ? { to: filters.to } : {}),
  }
}

export function PaymentsAdminPage() {
  const api = useApi()
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<ReconcileResult | null>(null)

  const query = useQuery({ ...adminLedgerQuery(api.admin, toQuery(filters, page)), placeholderData: keepPreviousData })
  const data = query.data

  const update = (next: Partial<Filters>): void => {
    setFilters((current) => ({ ...current, ...next }))
    setPage(1)
  }
  const activeCount =
    (filters.status === ALL ? 0 : 1) +
    (filters.mismatch ? 1 : 0) +
    (DATE.test(filters.from) ? 1 : 0) +
    (DATE.test(filters.to) ? 1 : 0)
  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: qk.admin.ledger() })
  }

  const renderActions = (row: AdminLedgerRowDto): ReactNode =>
    row.state === 'paid' || row.refundState !== 'none' ? <RefundAction row={row} onDone={refresh} /> : null

  return (
    <div className="grid gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Heading level={1} size="section">
            Payments
          </Heading>
          <Text variant="small" className="mt-1">
            Provider and PG records side by side. Differences are shown here and never fixed automatically.
          </Text>
        </div>
        <ConfirmAction
          renderTrigger={(open) => (
            <Button variant="secondary" onClick={open}>
              Reconcile with provider
            </Button>
          )}
          title="Reconcile payments?"
          consequence="This compares payments with the payment provider and flags differences. It changes no payment."
          confirmLabel="Run reconcile"
          actionLabel="reconcile payments"
          onConfirm={async (key) => {
            setResult(await api.admin.payments.reconcile({}, { idempotencyKey: key }))
            refresh()
          }}
        />
      </header>

      {result === null ? null : (
        <Banner tone={result.mismatches > 0 ? 'warning' : 'success'} title="Reconcile finished">
          Checked {result.checked} payments at {formatEventDateTime(result.ranAt)}. {result.mismatches} mismatched (
          {result.newMismatches} new).
        </Banner>
      )}

      <FilterBar
        label="Filter payments"
        activeCount={activeCount}
        onReset={() => {
          setFilters(NO_FILTERS)
          setPage(1)
        }}
        resultSummary={data === undefined ? undefined : `${data.pagination.total} payments`}
      >
        <Field label="Status" className="sm:w-48">
          <Select
            options={STATUS_OPTIONS}
            value={filters.status}
            onValueChange={(value) => {
              update({ status: PAYMENT_ORDER_STATES.find((state) => state === value) ?? ALL })
            }}
          />
        </Field>
        <Field label="Provider check" className="sm:w-48">
          <Select
            options={MISMATCH_OPTIONS}
            value={filters.mismatch ? 'mismatch' : ALL}
            onValueChange={(value) => {
              update({ mismatch: value === 'mismatch' })
            }}
          />
        </Field>
        <Field label="From" className="sm:w-44">
          <Input
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            value={filters.from}
            onChange={(event) => {
              update({ from: event.target.value })
            }}
          />
        </Field>
        <Field label="To" className="sm:w-44">
          <Input
            placeholder="YYYY-MM-DD"
            inputMode="numeric"
            value={filters.to}
            onChange={(event) => {
              update({ to: event.target.value })
            }}
          />
        </Field>
      </FilterBar>

      {data === undefined && query.isPending ? (
        <SkeletonRegion label="Loading payments">
          <TableSkeleton />
        </SkeletonRegion>
      ) : data === undefined ? (
        <ErrorState
          error={query.error}
          action="load payments"
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
      ) : (
        <ResponsiveTable
          caption="Payments ledger"
          columns={LEDGER_COLUMNS}
          rows={data.items}
          getRowId={(row) => row.id}
          actions={renderActions}
          actionsLabel="Refund"
          empty={
            <EmptyState framed={false} title="No payments match">
              Change or reset the filters to see more payments.
            </EmptyState>
          }
          footer={<TablePagination pagination={data.pagination} onPageChange={setPage} label="Payments pages" />}
        />
      )}
    </div>
  )
}
