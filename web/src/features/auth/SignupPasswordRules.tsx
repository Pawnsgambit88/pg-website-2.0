'use client'

import { useWatch, type Control } from 'react-hook-form'
import { Check } from '@/components/ui/icons/Check'
import { Close } from '@/components/ui/icons/Close'
import { cn } from '@/lib/cn'
import { PASSWORD_RULES, passwordRuleStatus, type SignupFormInput } from '@/features/auth/signup-flow'

interface SignupPasswordRulesProps {
  /** Id the password input points at with `aria-describedby`. */
  id: string
  control: Control<SignupFormInput>
}

/**
 * The password rules, visible before the first submit (TASK-051 AC). A leaf that subscribes to `password` and `email`
 * with `useWatch`, so typing re-renders only this list, never the form (RBP rerender-defer-reads). Each rule shows its
 * state three ways: a different icon shape (tick or cross), the word "Done" / "Not yet" for screen readers, and colour,
 * so colour is never the only signal. Not a live region: the password input describes itself with this list, and a
 * per-keystroke announcement would be noise.
 */
export function SignupPasswordRules({ id, control }: SignupPasswordRulesProps) {
  const [password = '', email = ''] = useWatch({ control, name: ['password', 'email'] })
  const status = passwordRuleStatus(password, email)

  return (
    <div id={id} className="grid min-w-0 gap-2">
      <p className="text-sm font-semibold wrap-break-word text-ink-soft">Your password needs to be</p>
      <ul className="grid min-w-0 gap-1">
        {PASSWORD_RULES.map((rule) => {
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
