// Shared Resend email helper for Edge Functions

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM = "Pawn's Gambit <noreply@pgchess.in>"

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }
  return res.json()
}

export function registrationConfirmationEmail({
  playerName,
  tournamentName,
  tournamentDate,
  venue,
  entryFee,
}: {
  playerName: string
  tournamentName: string
  tournamentDate: string
  venue: string
  entryFee: number
}) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;background:#0d1b2a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:#1e3a55;padding:32px;text-align:center">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="48" height="48" rx="8" fill="#1e3a55"/>
          <circle cx="24" cy="13" r="7" fill="white"/>
          <path d="M16 38 L18 28 Q20 24 24 24 Q28 24 30 28 L32 38 Z" fill="white"/>
          <rect x="14" y="37" width="20" height="4" rx="2" fill="white"/>
        </svg>
        <h1 style="color:#fff;font-size:20px;margin:16px 0 4px">You're registered!</h1>
        <p style="color:#94a3b8;margin:0;font-size:14px">Pawn's Gambit</p>
      </div>
      <div style="padding:32px">
        <p style="color:#cbd5e1;margin:0 0 24px">Hi ${playerName},</p>
        <p style="color:#cbd5e1;margin:0 0 24px">
          Your registration for <strong style="color:#fff">${tournamentName}</strong> is confirmed.
        </p>
        <div style="background:#14293d;border-radius:8px;padding:20px;margin-bottom:24px">
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="color:#64748b;font-size:13px;padding:6px 0">Tournament</td>
              <td style="color:#fff;font-size:13px;text-align:right">${tournamentName}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:13px;padding:6px 0">Date</td>
              <td style="color:#fff;font-size:13px;text-align:right">${tournamentDate}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:13px;padding:6px 0">Venue</td>
              <td style="color:#fff;font-size:13px;text-align:right">${venue}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-size:13px;padding:6px 0">Entry Fee Paid</td>
              <td style="color:#34d399;font-size:13px;text-align:right">₹${entryFee} ✓</td>
            </tr>
          </table>
        </div>
        <p style="color:#64748b;font-size:13px;margin:0">
          See you at the board — Pawn's Gambit
        </p>
      </div>
    </div>
  `
}

export function adminRegistrationEmail({
  playerName,
  playerEmail,
  tournamentName,
  paymentId,
}: {
  playerName: string
  playerEmail: string
  tournamentName: string
  paymentId: string
}) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto">
      <h2 style="margin:0 0 16px">New Registration — ${tournamentName}</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:6px 0;color:#666">Player</td><td style="padding:6px 0">${playerName}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Email</td><td style="padding:6px 0">${playerEmail}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Tournament</td><td style="padding:6px 0">${tournamentName}</td></tr>
        <tr><td style="padding:6px 0;color:#666">Razorpay ID</td><td style="padding:6px 0;font-family:monospace">${paymentId}</td></tr>
      </table>
    </div>
  `
}
