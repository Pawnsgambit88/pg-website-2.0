'use client'

import { useWatch, type Control } from 'react-hook-form'
import { Avatar } from '@/components/ui/Avatar'
import { Eyebrow } from '@/components/ui/Eyebrow'
import type { ProfileDto } from '@/lib/api/types/profile'
import type { PublicFormValues } from '@/features/player/profile/profile-form'

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const first = words[0]
  const last = words.length > 1 ? words[words.length - 1] : undefined
  const letter = (word: string | undefined) => (word === undefined ? '' : (Array.from(word)[0] ?? ''))
  const letters = `${letter(first)}${letter(last)}`
  return letters === '' ? 'PG player' : letters.toLocaleUpperCase('en-IN')
}

interface PublicPreviewProps {
  control: Control<PublicFormValues>
  profile: ProfileDto
}

/** Exactly what other players see: the saved details, filtered by the switches as they are now (before saving). */
export function PublicPreview({ control, profile }: PublicPreviewProps) {
  const flags = useWatch({ control })
  const name = flags.showDisplayName === true ? profile.name : initialsOf(profile.name)
  return (
    <div className="flex min-w-0 flex-col gap-3 border border-line bg-sand/40 p-4">
      <Eyebrow>Preview: what other players see</Eyebrow>
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={name} size="md" decorative />
        <p className="min-w-0 text-xl font-strong wrap-break-word">{name}</p>
      </div>
      <dl className="grid min-w-0 gap-1 text-sm">
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">PG ratings:</dt>
          <dd>{flags.showRatings === true ? 'Shown' : 'Hidden'}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">Chess.com handle:</dt>
          <dd className="wrap-break-word">
            {flags.showChessComHandle === true ? (profile.chessComHandle ?? 'None added yet') : 'Hidden'}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">City chapter:</dt>
          <dd className="wrap-break-word">
            {flags.showCityChapter === true ? (profile.city ?? 'None added yet') : 'Hidden'}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="text-muted">Email, phone, birthday:</dt>
          <dd className="font-strong">Never public</dd>
        </div>
      </dl>
    </div>
  )
}
