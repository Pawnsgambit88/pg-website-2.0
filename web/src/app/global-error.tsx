'use client'

// Last resort (ARCH-001 19.3): replaces the root layout when the root layout itself throws, so it renders its own
// document and cannot rely on the font variables. Styles come from globals.css. No message, stack or request data.
import './globals.css'

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main id="main" className="shell py-12">
          <h1 className="font-display text-page-intro">Something went wrong</h1>
          <p className="mt-4 max-w-prose">The site could not load. Try again in a moment.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="mt-6 inline-flex min-h-control items-center rounded-public bg-forest px-6 type-button text-parchment"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
