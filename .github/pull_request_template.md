## What this PR changes

<!-- One or two sentences. Which project, and what is new or different? -->

Project folder: `src/content/projects/<slug>/`

## Checklist

<!-- Tick each box with [x]. If an item doesn't apply, write "n/a" after it and say why under "Notes". -->

### Design (`docs/DESIGN.md`)

- [ ] Only tokens from `src/styles/tokens.css`: no hard-coded colors, font sizes or spacing
- [ ] No new colors, tints, gradients or shadows
- [ ] Square corners everywhere
- [ ] Text is black (white only on the black Stage and Footer)
- [ ] At most two surface colors per screen

### Images and media (`docs/MEDIA.md`)

- [ ] Every image has alt text that says what is visible and why it matters
- [ ] Scientific images are unaltered (no filters, no duplex), keep their scale bars, and have a caption with method and credit
- [ ] Speculative or AI-generated visuals are labeled as such
- [ ] File sizes are within the limits in MEDIA.md, and large files are tracked with Git LFS
- [ ] No people are shown without their consent
- [ ] Videos with speech have captions (`.vtt`)

### Content

- [ ] German `index.mdx` is complete
- [ ] English `en.mdx` is present, or the German fallback on the English page is intended
- [ ] Scientific statements were checked with the scientist (who, when: ...)
- [ ] Sources and credits are listed

### Testing

- [ ] Checked on a phone at 360 px width
- [ ] Usable with the keyboard alone (Tab, Enter, Esc), with visible focus
- [ ] Heavy content (video, 3D, splat, canvas, iframe, XR) loads only after "Start experience"

### Privacy and checks (`docs/PRIVACY.md`)

- [ ] `npm run check:external` passes
- [ ] `npm run check:budgets` passes
- [ ] No cookies, browser storage or requests to other domains (checked in the browser's Network tab, also after clicking "Start experience")
- [ ] Only files in my project folder changed, or the shared change was agreed with the maintainer

## Notes for reviewers

<!-- Anything unfinished, open questions, items marked n/a and why. -->
