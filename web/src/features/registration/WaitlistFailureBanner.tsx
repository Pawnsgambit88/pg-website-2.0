import { Banner } from '@/components/ui/feedback/Banner'
import type { WaitlistFailure } from '@/features/registration/waitlist'

/** One banner for every failed waitlist write. Announced once (`alert`); the tone also shows in the label word. */
export function WaitlistFailureBanner({ failure }: { failure: WaitlistFailure }) {
  const tone = failure.kind === 'settled' ? 'info' : failure.kind === 'retry' ? 'danger' : 'warning'
  return (
    <Banner tone={tone} live="alert" title={failure.title}>
      {failure.body}
      {failure.kind === 'retry' ? ' Nothing has changed yet. Try again.' : null}
    </Banner>
  )
}
