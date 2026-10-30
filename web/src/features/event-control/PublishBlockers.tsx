import { Banner } from '@/components/ui/feedback/Banner'
import type { EventOverviewDto } from '@/lib/api/types/admin/control-overview'

/** Why a draft cannot be published yet: the server's blockers in plain words. Shown under the header. */
export function PublishBlockers({ overview }: { overview: EventOverviewDto }) {
  const flag = overview.capabilities.canPublish
  if (flag === undefined || flag.allowed) return null
  const blockers = flag.blockers ?? []
  return (
    <Banner tone="warning" title="Not ready to publish">
      <p>{flag.reason}</p>
      {blockers.length === 0 ? null : (
        <ul className="mt-2 list-disc pl-5">
          {blockers.map((blocker) => (
            <li key={`${blocker.code}:${blocker.field ?? ''}`}>{blocker.reason}</li>
          ))}
        </ul>
      )}
    </Banner>
  )
}
