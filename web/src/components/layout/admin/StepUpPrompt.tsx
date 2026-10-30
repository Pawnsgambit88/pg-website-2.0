'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/form/Field'
import { Input } from '@/components/ui/form/Input'
import { Dialog } from '@/components/ui/overlay/Dialog'
import { registerPasswordPrompt } from '@/lib/api/browser/step-up-prompt'

/**
 * Step-up dialog (FE-13). Mounted once by AdminShell. It registers itself as the password prompt, so a sensitive admin
 * call that needs re-authentication (`promptForPassword` in the adapter, `withStepUpToken` for refund / role change)
 * opens it, and the call is retried by the step-up helper once the password has been exchanged for a grant. The dialog
 * never reads or keeps the password beyond the submit: the value is read from the input, resolved to the waiting caller
 * and the input is unmounted with the dialog. Cancel, Escape and outside click resolve `null` (the action is not run).
 * Concurrent requests share one dialog (the helper shares one pending prompt).
 */
export function StepUpPrompt() {
  const [open, setOpen] = useState(false)
  const resolveRef = useRef<((password: string | null) => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formId = useId()

  useEffect(
    () =>
      registerPasswordPrompt(
        () =>
          new Promise<string | null>((resolve) => {
            resolveRef.current?.(null) // a stale waiter is cancelled, never left hanging
            resolveRef.current = resolve
            setOpen(true)
          }),
      ),
    [],
  )

  const settle = (password: string | null): void => {
    resolveRef.current?.(password)
    resolveRef.current = null
    setOpen(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) settle(null)
      }}
      title="Confirm it is you"
      descriptionText="This action needs your password again. It is used once and not stored."
      size="sm"
      initialFocusRef={inputRef}
      footer={
        <>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              settle(null)
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} size="lg">
            Continue
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          const value = inputRef.current?.value ?? ''
          if (value !== '') settle(value)
        }}
      >
        <Field label="Password" required>
          <Input ref={inputRef} type="password" name="password" autoComplete="current-password" required />
        </Field>
      </form>
    </Dialog>
  )
}
