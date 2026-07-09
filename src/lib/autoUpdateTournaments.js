import { supabase } from './supabase'

/**
 * Silently promotes tournaments from upcoming/registration_open → ongoing
 * when their scheduled date/time has passed.
 * Call this once on app load (or page load) — it's safe to fire and forget.
 */
export async function autoUpdateTournamentStatuses() {
  try {
    const now = new Date().toISOString()

    const { data: due, error: fetchError } = await supabase
      .from('tournaments')
      .select('id')
      .in('status', ['upcoming', 'registration_open'])
      .lte('date', now)

    if (fetchError) throw fetchError
    if (!due?.length) return

    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ status: 'ongoing' })
      .in('id', due.map(t => t.id))

    if (updateError) throw updateError
  } catch (err) {
    console.error('autoUpdateTournamentStatuses:', err.message)
  }
}
