// The institutions behind Heritomics, in display order. The footer shows their logos, the About page their names.
// Logo files live in public/brand/, exactly as the institutions publish them: never redraw, recolor or crop a logo
// (docs/DESIGN.md 0.6). Colored logos can't go white for the black footer, so they sit on a white tile.
// To add a partner: put the logo file in public/brand/partners/ and add one entry here.

export interface Partner {
  /** Full name: shown on the About page and used as the logo's alt text */
  name: string;
  /** Language of the name when it is neither German nor English, so screen readers pronounce it right */
  lang?: string;
  /** File inside public/, with its size in pixels (keeps the space reserved while it loads) */
  logo: { file: string; width: number; height: number };
  /** true for colored logos: they sit on a white tile in the footer */
  tile: boolean;
}

export const partners: Partner[] = [
  {
    // Copied from the CD guideline until the press office sends the official files (public/brand/README.md)
    name: 'Hochschule Kaiserslautern',
    logo: { file: 'brand/hskl-logo-white.svg', width: 235, height: 102 },
    tile: false,
  },
  {
    name: 'BIOPOLIS',
    logo: { file: 'brand/partners/biopolis.svg', width: 140, height: 44 },
    tile: true,
  },
  {
    name: 'Centro de Investigação em Biodiversidade e Recursos Genéticos',
    lang: 'pt',
    logo: { file: 'brand/partners/cibio.svg', width: 252, height: 50 },
    tile: true,
  },
  {
    name: 'Alma Mater Studiorum – Università di Bologna',
    lang: 'it',
    logo: { file: 'brand/partners/unibo-seal.svg', width: 1595, height: 1595 },
    tile: true,
  },
];
