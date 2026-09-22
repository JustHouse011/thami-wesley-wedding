# Desktop visual review

Reviewed the local React page against the full Figma export at 1600 × 7767, section by section: hero, invitation, portraits, save the date, polaroids, RSVP introduction, RSVP form, and footer pattern.

Corrections made during comparison:

- Matched Fraunces display optical sizing, mixed-size text spacing, and the invitation body baseline.
- Used the original image crops, exact polaroid rotations, monograms, and decorative vectors.
- Preserved the pattern overlap. The trailing white canvas was subsequently removed at user request; the page now ends at 6532 pixels.
- Matched RSVP label sizes and fractional schedule borders.
- Used exported RSVP face glyphs. The calendar and pin use small CSS windows into the unmodified Figma reference PNG to preserve their original appearance.

The side-by-side images show Figma on the left and the browser on the right. Minor browser font and vector rasterization differences remain; this is not a claim of pixel-identical rendering. Numeric comparison results are in `results.json`.

Production build and strict TypeScript checking passed. Browser checks passed without console or runtime errors. Images and fonts loaded, countdown rollover and expiry behaved correctly, and the RSVP controls worked locally without a backend.

Only the fixed-width desktop composition is implemented. The verification browser's clock is frozen to Figma's display for screenshots; the application itself uses the live clock.


## Full-width desktop update

The main wrapper and section backgrounds now span the viewport. Content retains its approved desktop dimensions, photographs use cover cropping, and horizontal decorative bands repeat without distorting their motifs. The original 1600px render is retained as approved-desktop.png for comparison. Viewport checks cover 1280, 1440, 1600, 1920, and 2560 pixels; see viewport-results.json.

