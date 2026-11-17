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

Browser verification uses a local Google Chrome installation. It covers 360px to 1920px layouts with WebGL and reduced motion, intro skip and completion, context loss, clipboard actions, registry controls and mocked RSVP submissions. Screenshots are written to `verification/cinematic/`. Set `VERIFY_URL` to test a local production preview or `AXE_SCRIPT` to the path of `axe.min.js` for an accessibility scan at 390px and 1440px.

The invitation, RSVP and registry render before the cinematic enhancement loads. The Three.js scene uses WebP crops from the supplied invitation and pauses offscreen. Reduced-motion visitors and browsers without WebGL use the static artwork. Visitors can skip the intro with the on-screen button or Escape. Links and the browser retain native scroll behavior.

Confirm the Treasury of Love bank details with the site owner before approving publication.

## RSVP configuration on Vercel

Use the Vite framework preset, build command `npm run build`, and output directory `dist`. Keep the repository root as the Vercel project root so Vercel discovers `api/rsvp.ts` separately from the static Vite build. No Express server or API rewrite is needed.

Set these server-side environment variables in Vercel for each required environment, then deploy the verified implementation:

- `RESEND_API_KEY`: a Resend API key with sending permission.
- `RESEND_FROM_EMAIL`: the exact sender accepted by your verified Resend domain, optionally in `Display Name <address>` format. The function uses this value verbatim; there is no default or invented sender. No existing verified sender was found in this project. Configure a sender on your verified `thamidish.com` domain in Resend, then enter that approved sender here.

`.env.example` contains empty placeholders. Never prefix these variables with `VITE_`; they are read only in the server function. Local `.env` files and `.vercel` metadata are ignored. Only the placeholder `.env.example` should be tracked.

`npm run dev` serves the frontend only. To exercise actual local email delivery use Vercel's local development server (`vercel dev`) with the server environment configured, or test on a Vercel preview after deployment. Do not send test emails without deliberately configuring a sender and key.

The server accepts POST JSON, validates and trims inputs, and sends the organiser notification to `info@thamidish.com` through Resend. If the guest supplies an email address, the server sends a separate personalised HTML and plain-text acknowledgement after Resend accepts the organiser notification. Provider acceptance does not guarantee inbox delivery.

Both emails use separate keys derived from the validated RSVP. Identical requests reuse those keys within Resend’s 24-hour idempotency window. If the guest email cannot be queued, the page confirms that the RSVP is saved and offers a confirmation-only retry. The encrypted retry token survives a reload in the same tab and expires after one hour. It uses the existing server-side Resend key. No guest database is created.

The RSVP API accepts the original four fields as well as optional email, guest count and notes. Legacy acceptances default to one guest and declines default to zero. The automated tests mock both successful and failed deliveries.

The form no longer asks for a guest count. Attending guests who provide an email receive reminders scheduled through Resend for 20 and 26 November 2026 at 09:00 South African time. Dates already passed are skipped. Reminder scheduling uses separate idempotency keys and the email retry flow. This applies to new submissions. Earlier RSVPs require a separate backfill from the organiser’s records. Scheduled messages can be cancelled in Resend if attendance changes.

The artwork used in the redesign was extracted from the supplied invitation. Font files are served locally from Fontsource packages. Earlier Figma assets and verification captures are retained for reference.


