# Accessibility and Browser Compatibility Matrix

Last updated: 2026-03-24

## Scope

- Public routes: `/`, `/about`, `/team`, `/events`, `/media`, `/blog`, `/contact`, `/testimonies`
- Accessibility focus areas:
- Keyboard-only navigation on key flows
- Modal focus management and escape support
- Form label coverage
- Landmark and skip-link support

## Automated Accessibility Smoke Checks

Run:

```bash
npm run qa:accessibility
```

Current checks:

- Skip link exists and targets `#main-content`
- Every public page includes `<main id="main-content">`
- Home/Blog/Events/Team modal dialogs include `role="dialog"` and `aria-modal="true"`
- Newsletter/reminder forms include explicit label bindings
- No `<img>` tags without `alt` attributes on key public pages/layouts

## Browser Compatibility Matrix

| Browser | Version Target | Core Navigation | Forms + Modals | Notes |
| --- | --- | --- | --- | --- |
| Chrome | latest stable | Pass | Pass | Primary development baseline |
| Edge | latest stable | Pass | Pass | Chromium parity expected |
| Firefox | latest stable | Pass | Pass | Verify focus ring visibility |
| Safari | latest stable | Pass | Pass | Validate iOS modal scroll lock behavior |
| Mobile Chrome (Android) | latest stable | Pass | Pass | Touch targets + modal close behavior verified |
| Mobile Safari (iOS) | latest stable | Pass | Pass | Check keyboard dismissal and viewport jump handling |

## Keyboard-Only Test Checklist

1. `Tab` from skip link into main content on each public page.
2. Header mobile menu opens via keyboard and closes with `Escape`.
3. Team/Event/Blog/Home modals:
   - Open from keyboard
   - Initial focus lands inside dialog
   - `Tab` is trapped within dialog
   - `Escape` closes dialog
4. Newsletter and contact forms are fully operable without mouse.
5. Carousel/calendar interactive controls are focusable and actionable via keyboard.
