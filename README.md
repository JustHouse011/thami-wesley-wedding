# Thami & Wesley

Responsive wedding invitation, RSVP and gift registry for Thami Kotlolo and Wesley Willis. The celebration begins at **14:00 on 27 November 2026** at 22913 Selalelo Street, Ext 4, Mamelodi East, Pretoria.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 to view the site.

```sh
npm run build
npx tsx scripts/test-rsvp.ts
npm run verify
```

Browser verification uses the dev server and a local Google Chrome installation. It covers layouts from 360px to 1920px, keyboard controls, registry accordions, clipboard actions and mocked RSVP submissions. Screenshots are written to `verification/redesign/`. To include an axe accessibility scan at 390px and 1440px, set `AXE_SCRIPT` to the local path of `axe.min.js` from axe-core.

Confirm the Treasury of Love bank details with the site owner before approving publication.

## RSVP configuration on Vercel

Use the Vite framework preset, build command `npm run build`, and output directory `dist`. Keep the repository root as the Vercel project root so Vercel discovers `api/rsvp.ts` separately from the static Vite build. No Express server or API rewrite is needed.

Set these server-side environment variables in Vercel for each required environment, then deploy the verified implementation:

- `RESEND_API_KEY`: a Resend API key with sending permission.
- `RESEND_FROM_EMAIL`: the exact sender accepted by your verified Resend domain, optionally in `Display Name <address>` format. The function uses this value verbatim; there is no default or invented sender. No existing verified sender was found in this project. Configure a sender on your verified `thamidish.com` domain in Resend, then enter that approved sender here.

`.env.example` contains empty placeholders. Never prefix these variables with `VITE_`; they are read only in the server function. Local `.env` files and `.vercel` metadata are ignored. Only the placeholder `.env.example` should be tracked.

`npm run dev` serves the frontend only. To exercise actual local email delivery use Vercel's local development server (`vercel dev`) with the server environment configured, or test on a Vercel preview after deployment. Do not send test emails without deliberately configuring a sender and key.

The server accepts only POST JSON, trims and validates inputs, safely escapes HTML, sends HTML and plain text, and returns success only when Resend accepts the message. Provider acceptance does not guarantee inbox delivery. The browser disables submission while sending and retains a per-attempt idempotency key for retries. Resend deduplicates that key for its retention window (24 hours); fallback keys also protect identical requests without a client key. No guest database is created.

The RSVP API accepts the original four fields as well as optional email, guest count and notes. Legacy acceptances default to one guest and declines default to zero. The automated tests mock both successful and failed deliveries.

The artwork used in the redesign was extracted from the supplied invitation. Font files are served locally from Fontsource packages. Earlier Figma assets and verification captures are retained for reference.


