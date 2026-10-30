import { describe, expect, it } from 'vitest'
import { conflictFromLastChange, describeConflict, isVersionConflict } from '@/components/admin/versionConflict'

describe('versionConflict', () => {
  it('detects the code', () => {
    expect(isVersionConflict({ code: 'VERSION_CONFLICT' })).toBe(true)
    expect(isVersionConflict(new Error('x'))).toBe(false)
    expect(isVersionConflict(null)).toBe(false)
  })

  it('names the other editor and their change', () => {
    const info = conflictFromLastChange({
      by: { id: 'u', name: 'Asha' },
      at: '2026-10-28T10:00:00Z',
      summary: 'Edited the hero',
    } as never)
    const text = describeConflict(info, 'en-GB')
    expect(text).toContain('Asha')
    expect(text).toContain('Edited the hero')
  })

  it('falls back when there is no lastChange', () => {
    expect(describeConflict(conflictFromLastChange(null))).toBe('Someone else changed this while you were editing.')
  })
})
