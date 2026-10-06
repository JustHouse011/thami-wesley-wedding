# Thami & Wesley

Desktop implementation of Figma file `ftiHIbXdpTTuOUAXAAKVa1`, frame `3:2`.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 at a viewport width of **1600 pixels** for the exact Figma composition. The page spans the full desktop viewport and ends at 6652 pixels, including the footer below the pattern. At 1600 pixels it preserves the approved composition; wider viewports extend the backgrounds while keeping content sizes intact. Existing tablet and mobile layouts are preserved.

```sh
npm run build
npm run verify
```

Verification requires the dev server and a local Google Chrome installation. It freezes the test browser's clock to Figma's countdown values, saves a full-page screenshot and section comparisons to `verification/`, then checks the live timer and RSVP interactions with a mocked API response. Reference images appear on the left of each comparison; the local render appears on the right.

The live countdown targets **28 November 2026, 00:00 Pretoria time (UTC+02:00)** and stops at zero. The existing RSVP form posts JSON to `/api/rsvp`, a Vercel Node serverless function that uses the Resend SDK to notify `info@thamidish.com`. The email event date is **28 November 2028**, as requested; the page design and countdown are unchanged.

## RSVP configuration on Vercel

Use the Vite framework preset, build command `npm run build`, and output directory `dist`. Keep the repository root as the Vercel project root so Vercel discovers `api/rsvp.ts` separately from the static Vite build. No Express server or API rewrite is needed.

Set these server-side environment variables in Vercel for each required environment, then deploy the verified implementation:

- `RESEND_API_KEY`: a Resend API key with sending permission.
- `RESEND_FROM_EMAIL`: the exact sender accepted by your verified Resend domain, optionally in `Display Name <address>` format. The function uses this value verbatim; there is no default or invented sender. No existing verified sender was found in this project. Configure a sender on your verified `thamidish.com` domain in Resend, then enter that approved sender here.

`.env.example` contains empty placeholders. Never prefix these variables with `VITE_`; they are read only in the server function. Local `.env` files and `.vercel` metadata are ignored. Only the placeholder `.env.example` should be tracked.

`npm run dev` serves the frontend only. To exercise actual local email delivery use Vercel's local development server (`vercel dev`) with the server environment configured, or test on a Vercel preview after deployment. Do not send test emails without deliberately configuring a sender and key.

The server accepts only POST JSON, trims and validates inputs, safely escapes HTML, sends HTML and plain text, and returns success only when Resend accepts the message. Provider acceptance does not guarantee inbox delivery. The browser disables submission while sending and retains a per-attempt idempotency key for retries. Resend deduplicates that key for its retention window (24 hours); fallback keys also protect identical requests without a client key. No guest database is created.

Run `npx tsx scripts/test-rsvp.ts` for mocked API checks and `node scripts/verify-rsvp.mjs` with Vite running on port 5173 for desktop/mobile browser checks. These checks do not send real emails. `npm run verify` also uses a mocked successful response.

Exact Figma image and vector exports are in `public/assets/`. Font files are served locally from Fontsource packages. The original design context and full desktop export are retained in `design-reference/`.


