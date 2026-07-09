export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen px-4 py-24 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-slate-400 text-sm mb-10">Effective Date: 26 June 2026 · Last Updated: 26 June 2026</p>

      <div className="space-y-8 text-slate-300 leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">1. Introduction</h2>
          <p>Welcome to pgchess.in, the official website of Pawn's Gambit.</p>
          <p className="mt-3">This Privacy Policy explains how we collect, use, store, disclose and protect your personal information when you use our website, register for tournaments, participate in events, communicate with us or use any services provided through pgchess.in.</p>
          <p className="mt-3">By accessing or using this website, you agree to the collection and use of information in accordance with this Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">2. Website Operator</h2>
          <p>pgchess.in is owned and operated by:</p>
          <div className="mt-3 pl-4 border-l border-white/10 space-y-1">
            <p><span className="text-white font-medium">Sairam Kolaganti</span></p>
            <p>Operating under the brand name Pawn's Gambit</p>
            <p>Email: <a href="mailto:Official.pawnsgambit@gmail.com" className="text-blue-400 hover:underline">Official.pawnsgambit@gmail.com</a></p>
            <p className="mt-2">501, Sri Sai Sudharshan Homes<br />Narendra Nagar Colony<br />Ameenpur<br />Hyderabad – 502032<br />Telangana, India</p>
          </div>
          <p className="mt-3">Pawn's Gambit currently operates as an independent brand and community platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">3. Information We Collect</h2>
          <p>We collect information that you voluntarily provide as well as certain technical information necessary for operating the website.</p>

          <h3 className="text-white font-medium mt-5 mb-2">Personal Information</h3>
          <p>When registering for tournaments, leagues, workshops or contacting us, we may collect:</p>
          <ul className="list-disc pl-6 mt-2 space-y-1">
            {['Full Name','Email Address','Mobile Number','Date of Birth or Age','Gender (if requested)','Residential Area / Locality','City','Emergency Contact (where applicable)','Parent/Guardian details for minors','Chess.com Username','Lichess Username','FIDE Rating (if applicable)','PG Rating','Tournament History','Profile Photograph (where applicable)'].map(i => <li key={i}>{i}</li>)}
          </ul>

          <h3 className="text-white font-medium mt-5 mb-2">Payment Information</h3>
          <p>Payments made through pgchess.in are processed using Razorpay. We do not collect or store credit/debit card numbers, CVV, UPI PIN or net banking passwords. Payment information is securely handled by Razorpay according to their own Privacy Policy and security standards.</p>

          <h3 className="text-white font-medium mt-5 mb-2">Event Information</h3>
          <p>When participating in Pawn's Gambit events we may collect registration details, attendance history, tournament results, match history, leaderboard rankings, PG Ratings, and community participation history.</p>

          <h3 className="text-white font-medium mt-5 mb-2">Photographs & Videos</h3>
          <p>During events we may capture photographs, videos, interviews, testimonials and audio recordings. These may be used for community and promotional purposes.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">4. Information Automatically Collected</h2>
          <p>When you visit pgchess.in, we may automatically collect limited technical information including device type, browser type, operating system, IP address, date & time of visit, pages visited, and website performance logs.</p>
          <p className="mt-3">At present, pgchess.in does not intentionally use Google Analytics or advertising tracking services.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">5. WhatsApp Communications</h2>
          <p>Users may voluntarily opt into receiving updates through WhatsApp. By opting in, you consent to receiving messages regarding tournament registrations, event reminders, leaderboards, PG Ratings, community announcements, promotions and future events. You may opt out at any time by contacting us or leaving the relevant WhatsApp group.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">6. How We Use Your Information</h2>
          <p>We use your information to register participants for tournaments, process payments, issue refunds, publish tournament pairings and standings, maintain PG Ratings, verify player identities, contact participants, send event updates, improve website functionality and community experience, resolve disputes, detect fraud, enforce our Terms & Conditions, and comply with applicable laws.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">7. Public Player Information</h2>
          <p>Pawn's Gambit is a community-driven chess platform. To facilitate tournaments and maintain transparent competition, certain participant information will be publicly available, including name, PG Rating, leaderboard position, tournament history, tournament results, rankings, and community achievements.</p>
          <p className="mt-3">By registering for a Pawn's Gambit event, you consent to the publication of this information. PG Ratings are community ratings created solely by Pawn's Gambit and are not official FIDE ratings.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">8. Event Photography & Media Consent</h2>
          <p>Pawn's Gambit regularly photographs and records its tournaments and events. By participating in our events you grant Pawn's Gambit permission to use your name, image, photograph, video, voice and testimonial for purposes including Instagram, website, WhatsApp communities, event recaps, promotional campaigns, marketing material and community stories.</p>
          <p className="mt-3">No compensation shall be payable for such usage unless separately agreed. If you have concerns regarding a specific photograph or video, contact us at <a href="mailto:Official.pawnsgambit@gmail.com" className="text-blue-400 hover:underline">Official.pawnsgambit@gmail.com</a>. Reasonable requests will be reviewed individually.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">9. Information Sharing</h2>
          <p>We do not sell your personal information. Your information may be shared only where reasonably necessary with Razorpay, event venues, tournament arbiters, volunteers, technology providers, website hosting providers, and legal authorities where required by law.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">10. Data Security</h2>
          <p>We take reasonable administrative and technical measures to protect your personal information from unauthorized access, misuse or disclosure. However, no website or online service can guarantee complete security. Users acknowledge that internet transmissions always carry inherent security risks.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">11. Data Retention</h2>
          <p>We retain information only as long as reasonably necessary to maintain tournament records, PG Ratings, historical standings, resolve disputes, comply with legal obligations, and maintain financial records. Tournament history and public leaderboards may remain permanently available as part of Pawn's Gambit's historical archives.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">12. Minors</h2>
          <p>Minors may participate in Pawn's Gambit events. Registration of minors should be completed by a parent or legal guardian where applicable. Pawn's Gambit does not currently provide private messaging functionality between users through pgchess.in.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">13. Your Rights</h2>
          <p>Subject to applicable law, you may request access to your information, correction of inaccurate information, updating your information, withdrawal of promotional communications, and deletion of certain personal information where legally permissible.</p>
          <p className="mt-3">Some information such as tournament history, PG Ratings and public standings may continue to be retained where necessary for community records or legal compliance. Requests may be sent to <a href="mailto:Official.pawnsgambit@gmail.com" className="text-blue-400 hover:underline">Official.pawnsgambit@gmail.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">14. Third-Party Services</h2>
          <p>Our website may contain links to third-party services including Razorpay, Instagram, WhatsApp, Lichess and Chess.com. These services operate under their own Privacy Policies. Pawn's Gambit is not responsible for their content or privacy practices.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">15. Cookies</h2>
          <p>At present, pgchess.in does not intentionally use cookies for advertising or analytics purposes. If cookies or analytics technologies are introduced in the future, this Privacy Policy will be updated accordingly.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">16. Changes to this Privacy Policy</h2>
          <p>We may revise this Privacy Policy periodically. The latest version will always be available on pgchess.in. Continued use of the website after any update constitutes acceptance of the revised Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">17. Contact Us</h2>
          <div className="pl-4 border-l border-white/10 space-y-1">
            <p className="text-white font-medium">Sairam Kolaganti — Operator, Pawn's Gambit</p>
            <p>Email: <a href="mailto:Official.pawnsgambit@gmail.com" className="text-blue-400 hover:underline">Official.pawnsgambit@gmail.com</a></p>
            <p className="mt-2">501, Sri Sai Sudharshan Homes<br />Narendra Nagar Colony<br />Ameenpur<br />Hyderabad – 502032<br />Telangana, India</p>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white mb-3">18. Governing Law</h2>
          <p>This Privacy Policy shall be governed by and interpreted in accordance with the laws of India. Any disputes arising from this Privacy Policy shall be subject to the exclusive jurisdiction of the courts located in Hyderabad, Telangana.</p>
        </section>

      </div>
    </div>
  )
}
