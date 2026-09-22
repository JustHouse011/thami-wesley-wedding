# Thami & Wesley

Desktop implementation of Figma file `ftiHIbXdpTTuOUAXAAKVa1`, frame `3:2`.

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173 at a viewport width of **1600 pixels** for the exact Figma composition. The page spans the full desktop viewport and ends at 6532 pixels, immediately after the footer pattern. At 1600 pixels it preserves the approved composition; wider viewports extend the backgrounds while keeping content sizes intact. Tablet and mobile layouts are not implemented.

```sh
npm run build
npm run verify
```

Verification requires the dev server and a local Google Chrome installation. It freezes the test browser's clock to Figma's countdown values, saves a full-page screenshot and section comparisons to `verification/`, then checks the live timer and local RSVP interactions. Reference images appear on the left of each comparison; the local render appears on the right.

The live countdown targets **28 November 2026, 00:00 Pretoria time (UTC+02:00)** and stops at zero. RSVP fields and attendance choices work locally. Submitting does not send or save guest data; a status message makes that explicit.

Visual copy follows Figma verbatim, including the RSVP section's December 2023 date and placeholder venue. These intentionally differ from the wedding date above.

Exact Figma image and vector exports are in `public/assets/`. Font files are served locally from Fontsource packages. The original design context and full desktop export are retained in `design-reference/`.


