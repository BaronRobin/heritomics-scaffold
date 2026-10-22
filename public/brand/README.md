# Logo files

Logos of the HS KL and the Heritomics partners. The list of who appears where is `src/lib/partners.ts`.
Never draw, trace, recolor or approximate a logo (docs/DESIGN.md 0.6 and 2). Use the files as the institutions publish them.

## HS KL

| File | What it is | Where it appears | Status |
|---|---|---|---|
| `hskl-logo-black.svg` | Combined logo (Wort-Bild-Marke), black | Header, on white | missing: the header shows a placeholder |
| `hskl-logo-white.png` | Combined logo, white on black, 576 × 300 px | Footer, on black | stand-in: a web image thumbnail. Replace it with the official SVG |
| `hskl-mark-black.svg` | Shortened mark (verkürzte Bildmarke), black | Favicon | missing |

Get the official files from the HS KL press office. When the white SVG arrives, save it as `hskl-logo-white.svg`, delete the PNG and change the HS KL entry in `src/lib/partners.ts`.

## Partners (`partners/`)

Colored logos stay in their colors and sit on a white tile in the black footer.

| File | Institution | Source (downloaded 2026-10-22) |
|---|---|---|
| `biopolis.svg` | BIOPOLIS | https://www.biopolis.pt/temas/biopolis/images/logo.svg |
| `cibio.svg` | Centro de Investigação em Biodiversidade e Recursos Genéticos | SVG supplied by the project lead |
| `unibo-seal.svg` | Alma Mater Studiorum – Università di Bologna | https://commons.wikimedia.org/wiki/File:Seal_of_the_University_of_Bologna.svg (public domain vector by User:Nandhp; the seal is an insignia and a trademark, so use it only to name the partner) |

Before the final website goes live, ask each partner which logo version they want shown and confirm it may be used.
