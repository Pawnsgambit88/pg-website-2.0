'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { WaitlistFailureBanner } from '@/features/registration/WaitlistFailureBanner'
import { useWaitlistCommand } from '@/features/registration/useWaitlistCommand'
import type { Slug } from '@/lib/api/types/primitives'
import type { RegistrationDto } from '@/lib/api/types/registration'

interface LeaveWaitlistProps {
  slug: Slug
  registrationId: RegistrationDto['id']
  /** First button, e.g. "Leave waitlist" or "Decline this place". */
  label: string
  /** What leaving costs the player, said before the second tap. */
  warning: string
}

/**
 * Leave the waitlist (R07). A two-step control inside the panel (ask, then confirm) because leaving gives up the queue
 * position for good. No payment exists at this stage, so there is nothing to refund. The result is applied by R01.
 */
export function LeaveWaitlist({ slug, registrationId, label, warning }: LeaveWaitlistProps) {
  const [asking, setAsking] = useState(false)
  const leave = useWaitlistCommand(slug, 'leave', (registration, key) =>
    registration.cancelRegistration(registrationId, { idempotencyKey: key }),
  )

  if (!asking) {
    return (
      <Button variant="ghost" fullWidth onClick={() => setAsking(true)}>
        {label}
      </Button>
    )
  }
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4">
      <p id={`leave-waitlist-${registrationId}`}>{warning}</p>
      {leave.failure === null ? null : <WaitlistFailureBanner failure={leave.failure} />}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          variant="secondary"
          loading={leave.busy}
          loadingLabel="Leaving the waitlist"
          aria-describedby={`leave-waitlist-${registrationId}`}
          onClick={leave.submit}
        >
          Yes, leave
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            leave.reset()
            setAsking(false)
          }}
        >
          Keep my place
        </Button>
      </div>
    </div>
  )
}
