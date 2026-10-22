# Creative Science Hub: Design Guide

> **Status:** v0.1, draft for the course team.
> **Based on:** Corporate Design Guideline, Hochschule Kaiserslautern (v1.0, provisional, 12.12.2025). Where this guide and the HS KL guideline disagree, **the HS KL guideline wins**.
> **Audience:** every student group contributing to the hub, and every AI agent working in this repository.

This guide translates the HS KL corporate design (built mostly for print and social media) into rules for a web hub that hosts very different science experiences: video, 3D, VR, image essays, and interactive canvases. Its goal is that **each group's work looks like their own project, while the hub as a whole looks like one place.**

---

## 0. Rules for agents (read first)

If you are an AI agent editing this repo, these rules are non-negotiable:

1. **Use tokens only.** Every color, font, size, and spacing value comes from `src/styles/tokens.css`. Never hard-code a hex value, px font size, or spacing value in a component.
2. **No new colors.** The palette is fixed (section 3). Do not add tints, shades, gradients, or "a slightly darker blue".
3. **No rounded corners, no drop shadows, no gradients, no glassmorphism.** The brand is flat and square. The only exception is the duplex image filter in section 5.3.
4. **Text is black.** Body text and headlines are always black (`--color-black`) on white or on a surface color. The only exception is white text on the black Stage and Footer. Never set text in yellow, blue, or green.
5. **Uppercase only for the display font.** Stratos headlines are uppercase. Everything set in Matter uses normal mixed case. Never use `text-transform: uppercase` on Matter.
6. **Never redraw, recolor, animate, crop, or rebuild the HS KL logo.** Only use the official files in `public/brand/`. If they're missing, leave a placeholder and say so. Do not create an SVG approximation.
7. **Never filter scientific images.** Microscopy, data plots, maps, and measurements are shown unaltered: no duplex, no color grading, no cropping out scale bars (section 5.2).
8. **Max two surface colors per screen.** Plus white and black.
9. If a rule here seems to block what you are asked to do, **stop and ask** instead of working around it.

---

## 1. Concept

### 1.1 The idea in one line

**Forschung erfahrbar machen / Bringing research to life.** We are the bridge between scientists and everyone else. The hub should feel like walking into a good science exhibition: bold at the entrance, calm and clear once you're inside, and always with something more to discover.

### 1.2 Where the look comes from

| Source | What we take from it |
|---|---|
| **HS KL corporate design** | The complete visual system: colors, typefaces, square overlapping surfaces (*Flächenprinzip*), the x-based spacing, the 12-unit grid, the photo style, duplex images, and logo rules. |
| **The scientist's work** (Dr. Patrick Jung, XCEL – Extreme Cryptogam Ecology Lab, *selectedplants.de*) | Content and voice, not visual styling. His research is about cyanobacteria, green algae, lichens and biocrusts in extreme places (poles, Atacama Desert, caves), and how these tiny organisms shape whole landscapes. His public voice is personal, first person, and enthusiastic. |

### 1.3 The guiding metaphor: zoom levels

Patrick's research moves **from the micro niche to the landscape scale**. The hub uses the same idea for depth. Every experience page has three levels, and visitors choose how far to zoom in:

| Level | DE | EN | What the visitor gets | Time |
|---|---|---|---|---|
| 1 | **Überblick** | **Glance** | Headline, one-line hook, one strong image | 5 seconds |
| 2 | **Erleben** | **Experience** | The actual piece: video, 3D, VR, canvas, images | 2–15 minutes |
| 3 | **Vertiefen** | **Go deeper** | Method, scientist, design process, sources | As long as they want |

This is how the hub stays **simple at first sight but deep when you want it**. Level 1 must work on its own. Level 3 must never get in the way of level 2.

---

## 2. Logo and hub name

### 2.1 HS KL logo

- Use **only official files** from the HS KL press office, stored in `public/brand/` (SVG, black and white variants). These are not included in the repo by default; see `public/brand/README.md`.
- Use the **combined logo** (*Wort-Bild-Marke*) in the header, placed top-left and left-aligned.
- **Minimum height: 56 px.** If the space is smaller (e.g. favicon), use the official shortened mark (*verkürzte Bildmarke*), never a scaled-down full logo.
- **Clear space:** half the height of the mark (*Bildmarke*) on all sides. Nothing intrudes: no text, no edges, no busy image areas.
- **Colors:** black logo on white or light surfaces (white, yellow, blue, green); white logo on the black Stage and Footer. No other colors.
- **Separate mark and wordmark** (the large, cropped mark as seen on the flag) may only be used by trained designers, according to the HS KL guideline. **Do not use it in the scaffold.** If the team wants it, for example as a large graphic on the home page, get approval from the course leads first.

### 2.2 Hub name

"CREATIVE SCIENCE" is **set in type** (Stratos, uppercase) next to the HS KL logo with at least the logo's clear space between them. It is not a logo. Do not design a separate mark or icon for it without approval.

### 2.3 Favicon

The official shortened mark, black on white. Provide `favicon.svg` and a 180 px `apple-touch-icon.png` from the official files.

---

## 3. Color

### 3.1 Palette

| Token | Name | HEX | Use |
|---|---|---|---|
| `--color-white` | Weiß | `#ffffff` | Main background. The calm counterpart to the color surfaces. |
| `--color-black` | Schwarz | `#000000` | All text, the logo, rules, the Stage, and the Footer. |
| `--color-yellow` | Gelb | `#f3f707` | Surface color. Loudest; use for the single most important moment on a page. |
| `--color-blue` | Blau | `#38d5ff` | Surface color. |
| `--color-green` | Grün | `#d2f2e1` | Surface color. Quietest; works well next to colorful photos. |
| `--color-duplex` | Duplex-Blau | `#38affd` | **Only** for duplex images (section 5.3). Never a surface or UI color. |
| `--color-grey` | — | `#555555` | Secondary metadata (dates, file sizes) on **white only**. Use sparingly. |

### 3.2 Rules

- **White is the main color.** Most of every page is white.
- Use **one or two surface colors per screen**, never all three at once.
- **Colorful photos go with quiet surfaces** (green). **Muted photos go with strong surfaces** (yellow, blue).
- **Text on color is always black.** All combinations of black text with white, yellow, blue, or green pass WCAG AA.
- Surface colors are **never used as text, icon, or border colors** on white. Blue and yellow on white fail contrast.
- **No global dark mode.** The HS KL design is built on white. Immersive content gets a black **Stage** instead (section 7.4).
- Each project chooses **one key surface color** in its frontmatter (`surface: yellow | blue | green`). It's used on that project's page and as the color accent on its card.

---

## 4. Typography

### 4.1 Typefaces

| Role | Typeface | Weights | Case |
|---|---|---|---|
| Display / headlines | **Stratos** | ExtraBold only | UPPERCASE |
| Everything else | **Matter** | Regular 400, Medium 500, SemiBold 600, Bold 700 (+ italics) | Mixed case |

**Licensing (important):** Stratos and Matter are commercial typefaces. Before any font file goes into this repository or onto the live site, the team must confirm with HS KL that the university's license covers **web embedding** for this project. Font files must **not** be committed to a public repository without that confirmation.

### 4.2 Fallback mode

Until the brand fonts are cleared, the site runs in **fallback mode**, as the HS KL guideline prescribes:

- Text font: **Poppins** (self-hosted WOFF2, SIL Open Font License), then Arial.
- Display font: there is **no substitute for Stratos**. In fallback mode, headlines use Poppins Bold in **mixed case**, without uppercase.
- Switch modes with one attribute: `<html data-fonts="brand">` or `<html data-fonts="fallback">`, driven by the env variable `PUBLIC_BRAND_FONTS`.
- Do not substitute a look-alike condensed font for Stratos.

### 4.3 Type scale (web)

| Token | Style | Font / weight | Size | Line height |
|---|---|---|---|---|
| `--type-display` | Hero headline | Stratos ExtraBold, UPPERCASE | `clamp(2.5rem, 9vw, 8rem)` | 0.9 |
| `--type-h1` | Page headline | Stratos ExtraBold, UPPERCASE | `clamp(2.5rem, 6vw, 5rem)` | 0.9 |
| `--type-h2` | Section headline | Stratos ExtraBold, UPPERCASE | `clamp(1.75rem, 3.5vw, 3rem)` | 0.9 |
| `--type-h3` | Subheading | Matter SemiBold | `1.5rem` | 1.15 |
| `--type-lead` | Intro text (*Einstiegstext*) | Matter SemiBold | `clamp(1.25rem, 2vw, 1.5rem)` | 1.3 |
| `--type-quote` | Quote / subline | Matter Medium | `clamp(1.5rem, 2.5vw, 2rem)` | 1.25 |
| `--type-body` | Body text | Matter Regular | `1.125rem` (18 px) | 1.55 |
| `--type-topline` | Topline / label | Matter Bold | `0.875rem` | 1.3 |
| `--type-small` | Info text, captions | Matter Regular | `0.875rem` | 1.45 |
| `--type-cta` | Call to action | Matter Bold | `1rem` | 1.3 |

### 4.4 Rules

- **Umlaut rule:** Stratos headlines use line height 0.9, but if a German headline contains Ä, Ö, or Ü, use **1.0** so the dots don't collide with the line above. The `<Headline>` component handles this automatically. Don't override it.
- Body text is **left-aligned and ragged right**. Never justify. Center only short UI elements such as buttons, if at all.
- **Minimum size 14 px** on the web. This is stricter than the HS KL minimum of 10 px, for accessibility.
- **Line length:** max. `65ch` for body text.
- Emphasis inside text uses **Matter Bold**, not italics, color, or underline.
- Headlines are **short**: ideally up to five words. They may end with a period, like the HS KL examples ("DEINE ZUKUNFT BEGINNT HIER.").
- Use proper German quotation marks („…“) in German and "…" in English.

### 4.5 Typical text block (from the HS KL hierarchy)

```
Topline            → Matter Bold, small            "Biokrusten · Atacama"
HEADLINE           → Stratos ExtraBold, UPPERCASE  "LEBEN AUS NEBEL."
Lead text          → Matter SemiBold               1–2 sentences
Body               → Matter Regular
Call to action →   → Matter Bold + arrow           "Erlebnis starten →"
```

Spacing between text elements: **0.5x**. Between groups: **1x**.

---

## 5. Images

### 5.1 Photography

Following the HS KL style, adapted to research:

- **Documentary and authentic:** real moments in the lab, the field, and the studio. Real scientists and students, not models.
- **Natural light**, soft, with natural reflections.
- **Warm, natural color**, neither oversaturated nor desaturated.
- **Fieldwork and extreme places are the hero shots:** deserts, polar regions, caves, rock surfaces, the crust on the ground. They tell the story of scale.
- **No stock photos** of generic labs (glowing pipettes, people in goggles pointing at screens).
- **No AI-generated images presented as real science.** Speculative or illustrative visuals are welcome (speculative design is part of our method), but they must be **labeled as such** in the caption, e.g. "Speculative visualization".

### 5.2 Scientific images (microscopy, data, maps)

These are evidence, not decoration:

- Show them **unaltered:** no duplex, no filters, no color grading, no "boosting" colors.
- **Keep scale bars and labels.** Crop only if the scale bar stays visible or is re-added.
- **Always caption:** what it shows, the method or magnification, and credit. Example: *"Trebouxia cells inside a lichen. Light microscopy, 400×. Photo: XCEL Lab, HS Kaiserslautern."*
- Place them on **white** with a hairline frame if needed, not on color surfaces, so their colors aren't distorted by surroundings.

### 5.3 Duplex images

From the HS KL guideline: a gradient map from **white (light tones) to Duplex-Blau `#38affd` (dark tones)**. Use it for:

- **atmospheric and supporting images** (landscapes, lab spaces, textures),
- **weaker source material** (phone photos, mixed quality from different sources). Duplex makes them consistent,
- **backgrounds behind text surfaces.**

Do **not** use it for scientific images (section 5.2), portraits of people in the hub's intro sections, or every image on a page. At most one duplex image per screen.

**Implementation:** prefer processing at build time (an image script using `sharp`). For live use, there's a shared SVG filter:

```html
<svg width="0" height="0" aria-hidden="true" style="position:absolute">
  <filter id="duplex-blue" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer>
      <feFuncR type="table" tableValues="0.2196 1"/>
      <feFuncG type="table" tableValues="0.6863 1"/>
      <feFuncB type="table" tableValues="0.9922 1"/>
    </feComponentTransfer>
  </filter>
</svg>
```

```css
.duplex { filter: url(#duplex-blue); }
```

### 5.4 Image formats and sizes

| Image | Ratio | Minimum size | Notes |
|---|---|---|---|
| Project cover (required) | 3:2 | 2400 × 1600 px | Set `coverFocus` (e.g. `"50% 30%"`) for cropping. |
| Card crop (optional) | 4:5 | 1600 × 2000 px | Otherwise generated from the cover and focus point. |
| Inline images | free | 1600 px wide | |
| Social / OG image | 1200 × 630 px | — | Generated from the cover. |

Every image needs **alt text** (enforced by the schema). Alt text describes what is visible and why it matters, not "image of".

---

## 6. Layout

### 6.1 The x unit

Everything in HS KL layouts derives from one unit, **x**. On the web, x scales with the screen:

| Screen | `--x` |
|---|---|
| < 640 px | 24 px |
| 640–1199 px | 32 px |
| ≥ 1200 px | 40 px |

- **Page margin** (*Satzspiegel*): 1x on all sides.
- **Logo:** height = max(2x, 56 px).
- **Text on surfaces:** padding 1x left and top, **at least** 1x right and bottom.
- **Between text elements:** 0.5x. **Between groups:** 1x.
- **Between sections:** 2x–4x.
- For small UI internals (chip padding, icon gaps), use the fine scale `--space-1` (4 px) to `--space-4` (16 px).

### 6.2 Grid

- **12 columns** inside the page margins, gap 0.5x. This mirrors the 12-unit HS KL grid.
- Max. content width: **1440 px** plus margins. Full-bleed images and the Stage may go edge to edge.
- Mobile: 4 columns. Tablet: 8 columns. Desktop: 12 columns.

### 6.3 The surface principle (Flächenprinzip)

This is the **signature of the brand** and the main thing that makes pages feel like HS KL:

- Content sits on **rectangular surfaces** in white or a surface color. They're the stage for text, logos, and photos.
- Surfaces and images **overlap**. They should **never stand isolated** and **never sit exactly edge to edge**.
- Surfaces snap to the 12-column grid or bleed off the edge of the screen.
- **Contrast** comes from combining small and large surfaces or landscape and portrait shapes. Intense areas are balanced by **generous white space** elsewhere.
- Use surfaces **sparingly**. A typical screen has one or two overlapping surfaces, not a collage.
- On mobile, overlaps shrink to a **1x offset** so text never covers essential parts of images.
- Use the `<Surface>` component with `color`, `span`, and `overlap` props. Do not build surfaces with ad-hoc CSS.

### 6.4 Rules and dividers

- Hairline **black rules** (1 px) separate list rows and metadata, like the tables in the HS KL guideline.
- No boxes with borders around cards. Cards are defined by images and surfaces, not outlines.

---

## 7. Components

All components live in `src/components/` and are shown on `/styleguide`.

### 7.1 Header

White background. HS KL logo top-left, "CREATIVE SCIENCE" in Stratos next to it, navigation on the right (Matter Bold): **Erlebnisse / Experiences**, **Über / About**, language switch **DE | EN**. On mobile: logo + menu button. The menu opens as a full-screen yellow surface with large Matter SemiBold links.

### 7.2 Footer

Black background, white logo variant, white text. Includes: short project description, list of participating groups, **Impressum**, **Datenschutz**, and the line "Ein Projekt im Studiengang Virtual Design, Hochschule Kaiserslautern."

### 7.3 Links, buttons, and calls to action

- **Text link:** black, 1 px underline, offset 0.2em. On hover, the underline becomes 3 px.
- **CTA link:** Matter Bold + arrow **→**, underlined, as on the HS KL website ("Studiengänge →").
- **Primary button:** black background, white Matter Bold text, square, arrow →. Hover: background yellow, text black.
- **On the Stage:** yellow button with black text.
- **Focus state (all interactive elements):** 3 px solid black outline + 2 px white offset ring. This stays visible on every background. Never remove focus styles.
- Use **↗** only for links that leave the hub.

### 7.4 The Stage (experience frame)

Every experience (level 2, *Erleben*) sits on a **black Stage**: full-bleed or spanning the full grid. It's the one dark area of the site and gives video, 3D, and VR a consistent cinema-like frame.

**Before start** (poster state, nothing heavy loaded yet):
- Poster image (the cover, unaltered, or a dedicated poster),
- Topline with format and duration, e.g. "3D-Modell · 5 Min.",
- Requirement chips, e.g. "Kopfhörer", "Desktop empfohlen", "VR-Headset optional",
- Yellow button **"Erlebnis starten →" / "Start experience →"**,
- For external services: a small white notice saying which service will load ("Lädt Inhalte von YouTube").

**After start:** the embed fills the Stage. Fullscreen button at top right (white icon), caption and credits below the Stage on white.

Group-specific visuals live **inside** the Stage. Groups may style their own experience freely in there. Everything **around** the Stage follows this guide.

### 7.5 Experience card (index)

Image (4:5 or 3:2), then on white: topline (format · duration), title in Matter SemiBold (not Stratos, so the grid stays calm), one-line hook, and a small square in the project's key color as an accent. On hover: the image shifts slightly (2–4 px) and the title gets an underline. No shadows, no lifting cards.

### 7.6 Chips and badges

Matter Bold, `--type-small`, mixed case, square. White background with 1 px black border, or green surface without border. One style per context; don't mix.

### 7.7 Scientist card (level 3)

Portrait (real photo, natural light), name, role, institution, one first-person quote in Matter Medium. Patrick's own public voice is personal and enthusiastic; let scientists speak in their own words here.

### 7.8 Depth navigation

A slim sticky bar on experience pages: **Überblick · Erleben · Vertiefen**. The current level is underlined in black. It shows the visitor where they are and how far they can go.

### 7.9 Figure

Image + caption (`--type-small`) + credit (grey, on white only). Scientific images automatically get the "unaltered" treatment (no filters allowed).

---

## 8. Motion

- **Purpose only:** reveal surfaces, confirm interactions, guide the eye. No decorative loops.
- **Duration** 200–400 ms. **Easing** `cubic-bezier(0.2, 0, 0, 1)` (fast start, soft landing).
- **Surfaces slide in** a short distance (1x) along their overlap direction when scrolled into view. Each one moves once only.
- **Never animate the HS KL logo** or create animations that imitate its rings.
- **Loading states:** a simple, flat progress bar in black (on white) or white (on the Stage).
- `prefers-reduced-motion: reduce` → all movement is replaced by instant changes or short fades.

---

## 9. Voice and writing

### 9.1 Tone

**Curious, clear, and warm. Enthusiastic without hype.**

- German uses **du**, like the HS KL campaigns ("Besuch uns", "Gestalte deine Zukunft"). English uses **you**.
- **Plain language:** short sentences, active voice, one idea per sentence.
- **Explain every technical term** the first time it appears, in a few words: "Biokrusten, also lebende Schichten aus Algen, Flechten und Bakterien auf dem Boden".
- **Accurate before exciting:** every scientific statement is checked with the scientist. No "Sensation!", no "Forscher entdecken…" headlines that overstate results.
- **Scientists speak for themselves:** use first-person quotes. They make research personal.
- **Show scale:** the strongest stories link the tiny to the huge, e.g. a single cell to an entire desert.

### 9.2 Text lengths

| Element | Length |
|---|---|
| Headline | up to ~5 words |
| Hook (card, level 1) | max. 120 characters |
| Lead text | 1–2 sentences |
| "The question" section | max. ~80 words |
| Captions | 1–2 sentences + credit |

### 9.3 Examples

| ✓ Do | ✗ Don't |
|---|---|
| **LEBEN AUS NEBEL.** In der trockensten Wüste der Welt überleben Flechten, indem sie Nebel trinken. | Revolutionäre Forschungsergebnisse zur Atacama-Wüste |
| **WINZIG, ABER MÄCHTIG.** Grünalgen in Flechten halten ganze Ökosysteme zusammen. | Die Rolle von Trebouxia im symbiotischen Kontext extremophiler Habitate |
| Erlebnis starten → | Hier klicken |

---

## 10. Accessibility

- **WCAG 2.2 AA** at minimum.
- Contrast: only the color pairs in section 3.2. Never place text directly on photos without a surface underneath.
- Keyboard: everything usable with the keyboard, visible focus (section 7.3), logical order.
- Alt text required (schema-enforced). Captions/subtitles required for videos with speech.
- Every experience lists its **requirements** and offers an **alternative** where possible (e.g. video walkthrough of a VR piece, text description of an interactive).
- VR / motion-heavy content shows a **notice about motion sickness or flashing** before start.
- Language attributes set correctly (`lang="de"` / `lang="en"`), also on single foreign-language words where it matters.

---

## 11. Do and don't (summary)

| ✓ Do | ✗ Don't |
|---|---|
| Lots of white, one or two surface colors | Use all three surface colors at once |
| Overlap surfaces and images | Place surfaces isolated or edge to edge |
| Black text on any surface color | Colored text, white text on blue/yellow |
| Stratos UPPERCASE for headlines only | Stratos for body text, uppercase Matter |
| Square corners, flat surfaces | Rounded corners, shadows, gradients |
| Official logo files, correct clear space | Redraw, recolor, or animate the logo |
| Real field and lab photography | Stock photos, unlabeled AI imagery |
| Duplex for atmosphere and weak images | Duplex on microscopy or data |
| Scale bars and captions on scientific images | Cropping out scale bars, uncaptioned figures |
| Heavy experiences start on click, on the Stage | Autoplay, autoloading 3D or video |

---

## 12. Tokens (reference)

Source of truth: `src/styles/tokens.css`. This block mirrors it; if they differ, the file wins and this guide must be updated.

```css
:root {
  /* Colors: HS KL palette. No additions. */
  --color-white:  #ffffff;
  --color-black:  #000000;
  --color-yellow: #f3f707;
  --color-blue:   #38d5ff;
  --color-green:  #d2f2e1;
  --color-duplex: #38affd; /* images only */
  --color-grey:   #555555; /* secondary text on white only */

  /* Roles */
  --bg:           var(--color-white);
  --text:         var(--color-black);
  --stage-bg:     var(--color-black);
  --stage-text:   var(--color-white);
  --rule:         var(--color-black);
  --focus:        var(--color-black);
  --focus-halo:   var(--color-white);

  /* x unit */
  --x: 24px;
  --x-half: calc(var(--x) / 2);
  --x-2: calc(var(--x) * 2);
  --x-3: calc(var(--x) * 3);
  --x-4: calc(var(--x) * 4);

  /* Fine scale for UI internals */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;

  /* Layout */
  --grid-columns: 4;
  --grid-gap: var(--x-half);
  --content-max: 1440px;
  --measure: 65ch;
  --logo-height: max(calc(var(--x) * 2), 56px);

  /* Fonts */
  --font-display: "Stratos", "Poppins", Arial, sans-serif;
  --font-text:    "Matter", "Poppins", Arial, sans-serif;
  --display-weight: 800;
  --display-transform: uppercase;

  /* Type */
  --type-display: clamp(2.5rem, 9vw, 8rem);
  --type-h1:      clamp(2.5rem, 6vw, 5rem);
  --type-h2:      clamp(1.75rem, 3.5vw, 3rem);
  --type-h3:      1.5rem;
  --type-lead:    clamp(1.25rem, 2vw, 1.5rem);
  --type-quote:   clamp(1.5rem, 2.5vw, 2rem);
  --type-body:    1.125rem;
  --type-small:   0.875rem;
  --type-topline: 0.875rem;
  --type-cta:     1rem;

  --lh-display: 0.9;
  --lh-display-umlaut: 1;
  --lh-heading: 1.15;
  --lh-lead: 1.3;
  --lh-body: 1.55;
  --lh-small: 1.45;

  /* Shape and motion */
  --radius: 0;
  --rule-width: 1px;
  --focus-width: 3px;
  --ease: cubic-bezier(0.2, 0, 0, 1);
  --dur-fast: 200ms;
  --dur-base: 300ms;
  --dur-slow: 400ms;
}

@media (min-width: 640px)  { :root { --x: 32px; --grid-columns: 8; } }
@media (min-width: 1024px) { :root { --grid-columns: 12; } }
@media (min-width: 1200px) { :root { --x: 40px; } }

/* Fallback mode: no Stratos → no uppercase (per HS KL guideline) */
html[data-fonts="fallback"] {
  --font-display: "Poppins", Arial, sans-serif;
  --font-text:    "Poppins", Arial, sans-serif;
  --display-weight: 700;
  --display-transform: none;
  --lh-display: 1.05;
  --lh-display-umlaut: 1.1;
}

@media (prefers-reduced-motion: reduce) {
  :root { --dur-fast: 0ms; --dur-base: 0ms; --dur-slow: 0ms; }
}
```

---

## 13. Open questions for the course team

1. **Font license:** Does the HS KL license for Stratos and Matter cover web embedding for this project? Until then, fallback mode.
2. **Logo files:** Get the official SVGs (combined, shortened, black/white) from the HS KL press office.
3. **Sub-brand:** Is it OK to show "CREATIVE SCIENCE" as a typeset name next to the HS KL logo?
4. **Separate large mark:** Do we want the large cropped mark as a design element? This needs approval.
5. **Image rights:** Which photos from the XCEL Lab / selectedplants.de may we use, and with what credit line?
