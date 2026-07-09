import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts'
import { sendEmail, registrationConfirmationEmail, adminRegistrationEmail } from '../_shared/emails.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'admin@pgchess.in'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { paymentId, orderId, signature, tournamentId, userId } = await req.json()

    // Verify Razorpay HMAC signature
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!
    const expectedSignature = createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    if (expectedSignature !== signature) {
      throw new Error('Payment signature verification failed')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create registration as paid — only after payment is confirmed
    const { data: reg, error: regError } = await supabase
      .from('tournament_registrations')
      .upsert({
        tournament_id: tournamentId,
        user_id: userId,
        payment_status: 'paid',
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
      }, { onConflict: 'tournament_id,user_id' })
      .select('*, users(name, email), tournaments(name, date, venue, is_online, entry_fee)')
      .single()

    if (regError) throw regError

    // Send confirmation emails
    if (reg) {
      const tournament = reg.tournaments
      const player = reg.users
      const date = new Date(tournament.date).toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      const venue = tournament.is_online ? 'Online' : (tournament.venue ?? 'TBD')

      await Promise.allSettled([
        sendEmail({
          to: player.email,
          subject: `You're registered for ${tournament.name} — Pawn's Gambit`,
          html: registrationConfirmationEmail({
            playerName: player.name,
            tournamentName: tournament.name,
            tournamentDate: date,
            venue,
            entryFee: tournament.entry_fee,
          }),
        }),
        sendEmail({
          to: ADMIN_EMAIL,
          subject: `New registration: ${player.name} → ${tournament.name}`,
          html: adminRegistrationEmail({
            playerName: player.name,
            playerEmail: player.email,
            tournamentName: tournament.name,
            paymentId,
          }),
        }),
      ])
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
