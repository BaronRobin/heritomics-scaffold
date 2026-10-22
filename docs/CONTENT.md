# Writing a project page

This guide shows how to add your group's project to the hub: which files go where, what every field means, and how to write the text. You don't need to know how to code. You fill in a text file, and the site builds the page from it.

Related guides: [MEDIA.md](MEDIA.md) (preparing images, video, 3D), [EMBEDS.md](EMBEDS.md) (the formats in detail), [DESIGN.md](DESIGN.md) (the design rules), [CONTRIBUTING.md](../CONTRIBUTING.md) (Git and pull requests).

## 1. Your project folder

Each project is one folder named after its **slug**, the short name used in the web address, e.g. `leben-aus-nebel`. Agree on the slug with the maintainer and follow the naming rules in [CONTRIBUTING.md](../CONTRIBUTING.md#naming-conventions).

```
src/content/projects/<slug>/
  index.mdx        German text and all settings (required)
  en.mdx           English text only (optional, but please add it)
  cover.jpg        cover image (required)
  poster.jpg       still image on the Stage before the start (optional)
  figure.jpg       image next to "The question" (optional)
  sketch.js        your sketch, only for the canvas format
public/
  media/...        video, captions (.vtt), 3D models (.glb), splats (.spz)
  builds/<slug>/   a self-contained build for the iframe format (Unity Web build etc.)
```

**Start from the template.** Copy `templates/project/` to `src/content/projects/<slug>/` and replace everything in `[square brackets]`. See [templates/project/README.md](../templates/project/README.md).

**Why two places for files?** Images next to `index.mdx` go through the build: it makes smaller AVIF and WebP versions in several sizes, so you only export one JPEG. Video, 3D models, splats and builds are copied to the website as they are, so they live in `public/`. We suggest a subfolder per project, e.g. `public/media/<slug>/`. In the frontmatter you write their path **without** `public/` and without a leading slash: `media/<slug>/model.glb`. These paths must be lowercase, without spaces or umlauts.

Size limits and export settings for every file type are in [MEDIA.md](MEDIA.md).

## 2. What frontmatter is

`index.mdx` starts with a block between two `---` lines. This block is the **frontmatter**: a list of fields, one per line, written as `field: value`. The site reads these fields and places each one on the page. The format is called YAML. What you need to know:

- **Indent with two spaces**, never with tabs. Indented lines belong to the field above them.
- **Put text in double quotes** if it contains a colon followed by a space (`: `), a `#`, or starts with `[`, `{`, `*` or `"`. All placeholders in brackets need quotes: `group: "[Gruppenname]"`.
- **Lists** are written either in one line, `team: [Anna Beispiel, Ben Beispiel]`, or one item per line starting with `- `.
- **Long text** starts with `>-` and continues on the indented lines below. Line breaks inside become spaces.
- A line starting with `#` is a **comment**. It does not appear on the page.

If you make a mistake, `npm run validate` names the file and the field and says how to fix it.

## 3. Frontmatter reference (`index.mdx`)

"Req." means required: the build fails without it. Fields with a default can be left out. The limits come from the schema in `src/content.config.ts` and the checks in `npm run validate`.

### Overview and card

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `title` | yes | Headline of your page and title on the card. | Max. 60 characters; aim for about five words. May end with a period. |
| `hook` | yes | One line that makes people curious. Shown on the card and used as the page description for search engines and link previews. | Max. 120 characters. |
| `lead` | yes | Intro under the title on your page. | One or two sentences. |
| `lang` | no | Language of the file. | Always `de` in `index.mdx` (the default). |
| `group` | yes | Your group's name. Shown on the page and used by the group filter. | Text. |
| `team` | no | Names of the group members, in the credits at the end of the page. | List of names. Default: empty. |
| `supervision` | no | Names of the teachers, in the credits ("Betreuung"). | List of names. Default: empty. |
| `scientists` | yes | The researchers you worked with, shown as a card under "Vertiefen" and in the credits. | List with at least one entry. Each entry: `name`, `institution`, `field` (all required); `role` (optional); `quote` (optional, see below). `role` and `field` are not shown on the page yet. |
| `scientists[].quote` | no | A first-person quote by this researcher. | `text`, `lang` (`de` or `en`, the language of the quote) and `source` (where it was said or written), all three required. Quotes are not translated. |
| `field` | yes | Research field. Shown above the title and used by the filter. | Text. Use the exact spelling of other projects in the same field, e.g. `Biokrusten`, or the filter shows two entries. |
| `place` | no | Where the research happens, shown above the title. | Text, e.g. `Atacama-Wüste`. |
| `durationMinutes` | yes | How long the experience takes. Shown as "5 Min." on the card and the Stage. | Whole number above 0. |
| `requirements` | no | Short notes shown as chips on the Stage, e.g. `Kopfhörer`, `Desktop empfohlen`. | List of short texts. Default: empty. |
| `surface` | yes | Your project's key color, used on your page and as the accent on your card. | `yellow`, `blue` or `green` (DESIGN.md 3.2). |

### Cover and poster

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `cover` | yes | The main image: card, page header, and the Stage when there is no poster. | Path to an image next to `index.mdx`, e.g. `./cover.jpg`. 3:2, at least 2400 × 1600 px, max. 2 MB. Over 2 MB is an error; a smaller or differently shaped image only gets a warning. |
| `coverAlt` | yes | Alt text: describes the image for people who can't see it. | One sentence, at least 10 characters. Describe what is visible and why it matters, not "Bild von …". |
| `coverFocus` | no | The point that stays visible when the cover is cropped. | `"x% y%"`, e.g. `50% 30%` (0% 0% is top left). Default: `50% 50%`. |
| `coverCredit` | yes | Who took the photo. Shown on the image. | Text, e.g. `Dr. Patrick Jung (@selectedplants)`. |
| `duplexCover` | no | Shows the cover in the HS KL duplex style (white to blue), on your page only. | `true` or `false` (default). Never for scientific images or portraits (DESIGN.md 5.3). |
| `poster` | no | A separate still image on the Stage before the start, e.g. a frame from your video. | Path to an image next to `index.mdx`. Max. 500 KB. Default: the cover. |
| `posterAlt` | if `poster` | Alt text for the poster. | Required when `poster` is set. |

### Erleben: the Stage

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `stage` | no | Headline and one sentence next to the Stage, telling people what they can do. | `title` and `text`, both required if `stage` is used. Without it, the Stage shows your `title`. |
| `format` | yes | The kind of experience. | One of `video`, `images`, `model3d`, `splat`, `canvas`, `webxr`, `iframe`. |
| `embed` | yes | The settings for your format: which file, which description. | Depends on `format`, see the next table. |

Settings in `embed` per format. Which formats already run on the Stage is tracked in [PLAN.md](../PLAN.md). Every format except a YouTube or Vimeo video needs a `description`: one or two sentences (at least 20 characters) saying what people see or do, for those who can't see it.

| `format` | `embed` fields |
|---|---|
| `video`, own file | `sources`: list of `src` (`.mp4` or `.webm` in `public/`) and `type` (`video/mp4` or `video/webm`); `width` and `height` of the video in pixels; `captions` (optional): list of `src` (`.vtt` in `public/`), `lang`, `label`; `textAlternative` (optional): the text or speech of the video as text. |
| `video`, YouTube or Vimeo | `provider` (`youtube` or `vimeo`), `id` (the video's ID from its address), `title`. Loads only after a click, with a notice ([PRIVACY.md](PRIVACY.md)). Ask the maintainer first. |
| `images` | `items`: at least two images, each with `image` (path next to `index.mdx`), `alt`, `caption`, `credit` (optional), `scientific` (`true` for microscopy, data and maps; default `false`). |
| `model3d` | `src` (`.glb` in `public/`), `description`, `placeholder` (`true` shows a "Platzhalter" label; default `false`). |
| `splat` | Either `src` (`.spz`, `.ply`, `.splat` or `.ksplat` in `public/`) or `procedural: fog-cloud` (a generated placeholder), not both; `description`; `placeholder`. |
| `canvas` | `module`: file name of your sketch next to `index.mdx` (default `sketch.js`); `aspect`, written with spaces, e.g. `3 / 2` (default `16 / 9`); `description`. |
| `webxr` | `mode: inline` with `scene` (`.glb` in `public/`) and `description`, or `mode: external` with `url`, `platform` (e.g. `Meta Quest 3`) and `description`. |
| `iframe` | `kind: build` with `src` (an `.html` file in `public/`), `aspect`, `description`; or `kind: pixelstreaming` with `url` (`https://`), `service` (name shown in the notice), `offline` (optional: `url`, `label`), `aspect`, `description`. Pixel Streaming needs the maintainer's approval ([PRIVACY.md](PRIVACY.md#unreal-pixel-streaming)). |

The example projects in `src/content/projects/` show each format: `kaelte-als-zuhause` (video), `sample-images`, `leben-aus-nebel` (3D model), `sample-splat`, `sample-canvas`, `im-dunkeln-wachsen` (webxr), `sample-build` and `sample-pixelstreaming` (iframe).

### The question

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `question.title` | yes | The scientific question your project explores, as a short question. | Text. |
| `question.text` | yes | The question explained in plain language. | Max. about 80 words. More than 100 words is an error. |
| `question.source` | no | A link under the text, e.g. to the scientist's article. | `label` and `url` (a full web address). |
| `question.figure` | no | One image next to the question, e.g. a micrograph. | `image` (path next to `index.mdx`), `alt`, `caption` (all required), `scientific` (`true` for microscopy, data and maps: shown whole, unfiltered, on white). |

### Vertiefen: go deeper

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `method` | no | How the data were collected. Heading "Methode". | Text, usually a `>-` block. |
| `results` | no | What the data show. Heading "Was die Daten zeigen". | Text. |
| `design` | no | How your group turned the research into an experience. Heading "Gestaltung". | Text. |
| `sources` | no | Literature and links. | List. Each entry: `title` (required, the full reference), `url` (optional, full web address), `lang` (optional, `de` or `en`). Not translated. |

### Publishing and order

| Field | Req. | What it is | Format and limits |
|---|---|---|---|
| `status` | no | `draft`: only visible in `npm run dev`. `published`: on the website. | Default: `draft`. |
| `listed` | no | `false` hides the project from the home page, the index and the previous/next links. Its page still exists at its address. | `true` (default) or `false`. |
| `featured` | no | Shows the project on the home page. If no project is featured, the home page shows the first three. | `true` or `false` (default). Agree with the maintainer. |
| `order` | no | Position in lists: lower numbers come first, equal numbers sort by title. | Number. Default: `100`. |
| `example` | no | Marks the scaffold's example projects with a "Beispiel" label. | Leave it out in your project. |

## 4. The English version (`en.mdx`)

`en.mdx` holds **only text**. Images, files, the format and all settings come from `index.mdx`. It has its own frontmatter with these fields:

- **Required:** `title`, `hook`, `lead` (same limits as in German).
- **Optional:** `place`, `field`, `requirements`, `coverAlt`, `posterAlt`, `question` (`title`, `text`, `source`, `figure.alt`, `figure.caption`), `stage` (`title`, `text`), `method`, `results`, `design`, `embed` (`description`, `textAlternative`, and `items` with `alt` and `caption` for the images format).
- `lang` is always `en`. Other fields are ignored.

### The fallback rule

The English page (`/en/experiences/<slug>/`) uses each English field you wrote. **Every field you leave out shows the German text instead**, marked as German for screen readers, and the page shows the note "This project is only available in German so far." Without any `en.mdx`, all project texts on the English page are in German.

Things to watch:

- **Lists are matched by position.** The second item in `requirements` (or in `embed.items`) in `en.mdx` translates the second item in `index.mdx`. Keep the same order.
- **`question.source` in `en.mdx` replaces the German link** completely. Use it to point to an English version of the article.
- **Not translated:** `group`, `team`, `supervision`, `scientists` (including quotes, which stay in their original language), `sources`, `coverCredit` and image credits. They appear the same on both pages.
- `npm run validate` warns when `en.mdx` is missing or lacks a text that `index.mdx` has.

### Text below the frontmatter

You can write normal text (Markdown) below the closing `---` of `index.mdx`. It appears under "Vertiefen", after "Gestaltung". At the moment it shows **in German on both pages**: the text below the frontmatter in `en.mdx` is not displayed yet. So for now, put your texts in the fields above. If you do use it, every image in it needs alt text: `![What the image shows](./photo.jpg)`.

## 5. Draft, published, unlisted

- **`status: draft`** (the default): your page appears in `npm run dev` only, in the index and at its address. It is not part of the built site, so it's not in `npm run preview` and not online. Use it while you work.
- **`status: published`**: the page is built and goes online once your pull request is merged into `main`.
- **`listed: false`**: the page is built and online, but it is not on the home page, in the index or in the previous/next links. Only people with the link find it. The scaffold uses this for format samples.

Look at your page while you work: run `npm run dev` and open `http://localhost:4321/de/erlebnisse/<slug>/` and `http://localhost:4321/en/experiences/<slug>/`.

## 6. A complete example, explained

This is the frontmatter of the example project `leben-aus-nebel` (3D model), slightly shortened. Comments starting with `#` explain each part. The files are in `src/content/projects/leben-aus-nebel/`.

```yaml
---
# ── Überblick ──
title: Leben aus Nebel.                      # about five words; a period at the end is fine
hook: Wie eine Flechtenkruste in der Atacama-Wüste vom Nebel lebt.   # card + link previews, max. 120 characters
# lead: 1–2 sentences under the title. Here three short ones, one idea each.
lead: An einem der trockensten Orte der Welt regnet es fast nie. Trotzdem wächst dort eine Kruste aus Flechten. Ihr Wasser kommt aus dem Nebel.
group: "[Gruppenname]"                       # placeholders in [brackets] need quotes
team: ["[Namen der Gruppe]"]
supervision: ["[Lehrende]"]
scientists:                                  # at least one researcher
  - name: Dr. Patrick Jung
    institution: XCEL – Extreme Cryptogam Ecology Lab, Hochschule Kaiserslautern
    field: Flechten- und Biokrustenökologie
    quote:                                   # first person, in the language it was said in
      text: The lichen is not living in the crust. The lichen is the crust, and the soil follows from it.
      lang: en
      source: selectedplants.de
field: Biokrusten                            # same spelling as other projects in this field (filter)
place: Atacama-Wüste
durationMinutes: 5                           # a number only, shown as "5 Min."
requirements: [Desktop empfohlen, "Maus, Touch oder Tastatur", Ohne Ton]   # quotes because of the commas
surface: green                               # key color: yellow, blue or green

# ── Cover ──
cover: ./cover.jpg                           # next to index.mdx
coverAlt: Ausgetrockneter, rissiger Boden vor Hügeln unter blauem Himmel.   # what is visible
coverFocus: 50% 60%                          # keep the lower middle visible when cropping
coverCredit: Dr. Patrick Jung (@selectedplants)
duplexCover: true                            # atmospheric landscape: duplex is allowed
poster: ./poster.jpg                         # a closer view for the Stage
posterAlt: Kruste mit kleinen, glänzenden braunen Kügelchen aus der Nähe.

# ── Erleben ──
stage:
  title: Erkunde die Kruste.
  text: "Dreh und zoom die Kruste. [Platzhalter-Modell: Ein echter Scan der Gruppe ersetzt es.]"
format: model3d
embed:
  src: media/placeholder-crust.glb           # = public/media/placeholder-crust.glb, written without "public/"
  placeholder: true                          # shows a "Platzhalter" label; remove when the real scan is in
  # description: for people who can't see the model. It says honestly what the model is.
  description: Platzhalter-Modell aus 34 Kieseln auf einer runden Scheibe, manche hell, manche mit schwarzer oder grünlicher Kruste. Es ist kein wissenschaftliches Modell.

# ── Die Frage ──
question:
  title: Wie überlebt man ohne Regen?
  # text: long text after >- on indented lines. Max. about 80 words.
  # Every technical term is explained the first time it appears ("also eine …").
  text: >-
    An der Küste der Atacama-Wüste regnet es fast nie. Wasser bringt nur der Nebel, dort Camanchaca genannt.
    Er zieht vom Pazifik heran und hängt ein paar Stunden als Tropfen am Boden. In diesem kurzen Fenster lebt
    die Grit Crust: eine Haut aus Mikroben, die sich um millimetergroße Granitkörnchen legt. Neue Forschung
    zeigt, dass diese Kruste selbst eine Flechte ist, also eine enge Lebensgemeinschaft aus Pilz und Alge.
  source:
    label: Nach Dr. Patrick Jung, selectedplants.de
    url: https://www.selectedplants.de/post/new-research-fog-symbiosis-and-survival-the-atacama-grit-crust-is-a-lichen-not-a-soil-microbiom
  figure:
    image: ./figure.jpg
    alt: Mikroskopaufnahme runder, mehrfach geteilter Zellen mit Maßstabsbalken von 10 µm.
    caption: "[Was das Bild zeigt, ergänzt Patrick Jung.] Mikroskopie, unbearbeitet, mit Original-Maßstab. Foto: Dr. Patrick Jung (@selectedplants)"
    scientific: true                         # micrograph: shown whole and unfiltered, scale bar kept

# ── Vertiefen ──
method: >-
  Das Team hat Dutzende Proben entlang eines Nebelgefälles genommen, von nebelreichen Orten an der Küste bis ins
  trockenere Inland. Mit Metabarcoding, also dem Auslesen kurzer Erbgut-Abschnitte aus einer ganzen Probe, wurde
  bestimmt, wer in der Kruste lebt: Bakterien, Algen und Pilze.
# results and sources are shortened here ([…]). A # inside a >- block would become part of the text.
results: >-
  Die Kruste ist wie eine Flechte aufgebaut, nicht wie ein Bodenmikrobiom, also die Mikrobengemeinschaft eines
  Bodens. […]
design: "[Wie die Gruppe aus der Forschung ein Erlebnis gemacht hat: Ideen, Prototypen, Entscheidungen.]"
sources:
  - title: >-
      Jung, P., Werner, L., Brand, R., Briegel-Williams, L., Baumann, K., Letendu, G. & Lakatos, M. (2026).
      Fog, Symbiosis, and Survival: […]. Environmental Microbiology 28(6), e70350.
    url: https://doi.org/10.1111/1462-2920.70350
    lang: en                                 # the source is in English

# ── Publishing ──
status: published
featured: true                               # on the home page
example: true                                # scaffold example only; leave this out in your project
order: 1                                     # first in every list
---
```

And the matching `en.mdx`, shortened. It has only text fields:

```yaml
---
title: Life from fog.
hook: How a lichen crust in the Atacama Desert lives on fog.
lead: In one of the driest places on Earth it almost never rains. Yet a crust of lichens grows there. Its water comes from the fog.
field: Biocrusts
place: Atacama Desert
requirements: [Desktop recommended, "Mouse, touch or keyboard", No sound]   # same order as in German
coverAlt: Dry, cracked ground in front of hills under a blue sky.
posterAlt: Close-up of a crust with small, shiny brown beads.
question:
  title: How do you survive without rain?
  text: >-
    On the coast of the Atacama Desert it almost never rains. […]
  figure:
    alt: Micrograph of round cells divided into several parts, with a 10 µm scale bar.
    caption: "[What the image shows, to be added by Patrick Jung.] Microscopy, unaltered, with the original scale bar. Photo: Dr. Patrick Jung (@selectedplants)"
embed:
  description: Placeholder model of 34 pebbles on a round disc, some pale, some with a black or greenish crust. It is not a scientific model.
---
```

## 7. Writing rules

From [DESIGN.md](DESIGN.md), section 9. They apply to every text on your page, in both languages.

### Tone

**Curious, clear and warm. Enthusiastic without hype.**

- **German uses du, English uses you.** Like the HS KL campaigns: „Dreh und zoom die Kruste.“ / "Rotate and zoom the crust."
- **Plain language.** Short sentences, active voice, one idea per sentence.
- **Explain every technical term** the first time it appears, in a few words: „Biokrusten, also lebende Schichten aus Algen, Flechten und Bakterien auf dem Boden“.
- **Accurate before exciting.** Check every scientific statement with your scientist. No „Sensation!“, no „Forscher entdecken …“ headlines that overstate results.
- **Scientists speak for themselves.** Use first-person quotes in their own words (`scientists[].quote`), approved by them. Don't invent or paraphrase quotes.
- **Show scale.** The strongest stories link the tiny to the huge, e.g. a single cell to an entire desert.

### Lengths

| Element | Field | Length |
|---|---|---|
| Headline | `title`, `stage.title`, `question.title` | up to about 5 words |
| Hook (card, level 1) | `hook` | max. 120 characters |
| Lead text | `lead` | 1–2 sentences |
| "The question" | `question.text` | max. about 80 words |
| Captions | `caption` fields | 1–2 sentences + credit |

### Examples

| Do | Don't |
|---|---|
| **Leben aus Nebel.** In der trockensten Wüste der Welt überleben Flechten, indem sie Nebel trinken. | Revolutionäre Forschungsergebnisse zur Atacama-Wüste |
| **Winzig, aber mächtig.** Grünalgen in Flechten halten ganze Ökosysteme zusammen. | Die Rolle von Trebouxia im symbiotischen Kontext extremophiler Habitate |
| Erlebnis starten → | Hier klicken |

### Small rules that matter

- **Quotation marks:** „…“ in German, "…" in English (DESIGN.md 4.4).
- **Alt text** describes what is visible and why it matters. Don't start with „Bild von …“ or "Image of …" (DESIGN.md 5.4).
- **Captions of scientific images** say what the image shows, the method or magnification, and the credit: *"Trebouxia cells inside a lichen. Light microscopy, 400×. Photo: XCEL Lab, HS Kaiserslautern."* (DESIGN.md 5.2).
- **Speculative or AI-generated visuals** are labeled as such in the caption or description, e.g. „Spekulative Visualisierung“ (DESIGN.md 5.1).
- **Placeholders** go in `[square brackets]`, so everyone can see what is still missing.

## 8. Before you open a pull request

1. `npm run validate`: no errors. Read the warnings and fix what you can.
2. `npm run dev`: check your page in German and English, on a phone-sized window, and with the keyboard only.
3. Set `status: published` when the page is ready to go online.
4. Open the pull request and go through its checklist ([CONTRIBUTING.md](../CONTRIBUTING.md)).
