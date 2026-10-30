'use client'

import { useWatch, type Control } from 'react-hook-form'
import { Check } from '@/components/ui/icons/Check'
import { Close } from '@/components/ui/icons/Close'
import { cn } from '@/lib/cn'
import { RESET_PASSWORD_RULES, resetRuleStatus, type ResetConfirmFormInput } from '@/features/auth/reset-flow'

interface ResetPasswordRulesProps {
  /** Id the new-password input points at with `aria-describedby`. */
  id: string
  control: Control<ResetConfirmFormInput>
}

/**
 * The password rules, visible before the first submit (same look as the sign-up rules). A leaf that subscribes to
 * `newPassword` with `useWatch`, so typing re-renders only this list (RBP rerender-defer-reads). Each rule shows its
 * state as an icon shape, a screen-reader word and colour, so colour is never the only signal. Not a live region.
 */
export function ResetPasswordRules({ id, control }: ResetPasswordRulesProps) {
  const password = useWatch({ control, name: 'newPassword' })
  const status = resetRuleStatus(password)

  return (
    <div id={id} className="grid min-w-0 gap-2">
      <p className="text-sm font-semibold wrap-break-word text-ink-soft">Your new password needs to be</p>
      <ul className="grid min-w-0 gap-1">
        {RESET_PASSWORD_RULES.map((rule) => {
          const met = status[rule.id]
          return (
            <li
              key={rule.id}
              className={cn(
                'flex min-w-0 items-start gap-2 text-sm wrap-break-word',
                met ? 'text-success-ink' : 'text-muted',
              )}
            >
              {met ? <Check size="sm" className="mt-0.5" /> : <Close size="sm" className="mt-0.5" />}
              <span className="min-w-0">
                <span className="sr-only">{met ? 'Done: ' : 'Not yet: '}</span>
                {rule.label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
