// Content schema for group projects. Each project is one folder in src/content/projects/<slug>/:
//   index.mdx  German version with every field (required)
//   en.mdx     English text only (optional; missing fields fall back to German)
// Error messages are written for designers: they name the field and say how to fix it.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const BASE = './src/content/projects';
const folderId = ({ entry }: { entry: string }) => entry.split('/')[0];
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** A file inside public/, written without a leading slash, e.g. "media/clip.mp4". */
const publicFile = (field: string, exts: string[]) =>
  z.string({ error: `Missing: give a file path inside public/, e.g. "media/example.${exts[0]}".` })
    .regex(new RegExp(`^[a-z0-9][a-z0-9/_.-]*\\.(${exts.join('|')})$`), {
      error: `Use a lowercase path inside public/ that ends in .${exts.join(' or .')} (no spaces, no umlauts, no leading slash).`,
    });

const description = (field: string) =>
  z.string({ error: `Missing: describe in one or two sentences what people see or do, for those who can't see it.` })
    .min(20, { error: `Too short: write at least one full sentence.` });

const aspect = z.string().regex(/^\d+ \/ \d+$/, { error: 'Write it like "16 / 9".' }).default('16 / 9');

const projects = defineCollection({
  loader: glob({ pattern: '*/index.mdx', base: BASE, generateId: folderId }),
  schema: ({ image }) => {
    const alt = (field: string) =>
      z.string({ error: `Missing: describe in one sentence what the image shows and why it matters (read aloud by screen readers).` })
        .min(10, { error: `Too short: describe what is visible, not just "image" or "photo".` });

    const figure = z.object({
      image: image(),
      alt: alt('question.figure.alt'),
      caption: z.string({ error: 'Missing: say what it shows, the method or magnification, and the credit (DESIGN.md 5.2).' }),
      scientific: z.boolean().default(false),
    });

    const base = z.object({
      title: z.string({ error: 'Missing: a short title, about five words.' }).max(60, { error: 'Keep it to about five words (DESIGN.md 9.2).' }),
      hook: z.string({ error: 'Missing: one line that makes people curious.' }).max(120, { error: 'Keep it under 120 characters (DESIGN.md 9.2).' }),
      lead: z.string({ error: 'Missing: one or two sentences under the title.' }),
      lang: z.literal('de', { error: 'index.mdx is the German version, so lang must be "de". Put English text in en.mdx.' }).default('de'),
      group: z.string({ error: 'Missing: your group name.' }),
      team: z.array(z.string()).default([]),
      supervision: z.array(z.string()).default([]),
      scientists: z.array(z.object({
        name: z.string(),
        institution: z.string(),
        role: z.string().optional(),
        field: z.string(),
        quote: z.object({ text: z.string(), lang: z.enum(['de', 'en']), source: z.string() }).optional(),
      }), { error: 'Missing: list at least one researcher (name, institution, field).' }).min(1, { error: 'List at least one researcher.' }),
      field: z.string({ error: 'Missing: the research field, e.g. "Biokrusten". It is used by the filter.' }),
      place: z.string().optional(),
      durationMinutes: z.number({ error: 'Missing: how long the experience takes, in minutes.' }).int().positive(),
      requirements: z.array(z.string()).default([]),
      surface: z.enum(['yellow', 'blue', 'green'], { error: 'Choose yellow, blue or green (your project\'s key color).' }),
      cover: image(),
      coverAlt: alt('coverAlt'),
      coverFocus: z.string().regex(/^\d{1,3}% \d{1,3}%$/, { error: 'Write it like "50% 30%".' }).default('50% 50%'),
      coverCredit: z.string({ error: 'Missing: who took the cover photo.' }),
      duplexCover: z.boolean().default(false),
      poster: image().optional(),
      posterAlt: z.string().optional(),
      question: z.object({
        title: z.string(),
        text: z.string().refine((s) => words(s) <= 100, { error: 'Keep it to about 80 words (DESIGN.md 9.2).' }),
        source: z.object({ label: z.string(), url: z.url() }).optional(),
        figure: figure.optional(),
      }, { error: 'Missing: the scientific question in plain language (title + text).' }),
      stage: z.object({ title: z.string(), text: z.string() }).optional(),
      method: z.string().optional(),
      results: z.string().optional(),
      design: z.string().optional(),
      sources: z.array(z.object({ title: z.string(), url: z.url().optional(), lang: z.enum(['de', 'en']).optional() })).default([]),
      status: z.enum(['draft', 'published'], { error: 'status: "draft" (hidden on the live site) or "published".' }).default('draft'),
      featured: z.boolean().default(false),
      example: z.boolean().default(false),
      // false = not on the home page or in the index (e.g. samples shown only on the styleguide)
      listed: z.boolean().default(true),
      order: z.number().default(100),
    });

    // One schema option per format. Adding a format = one entry here + one component (docs/EMBEDS.md).
    const video = z.union([
      z.object({
        sources: z.array(z.object({ src: publicFile('embed.sources.src', ['mp4', 'webm']), type: z.enum(['video/mp4', 'video/webm']) })).min(1),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        captions: z.array(z.object({ src: publicFile('embed.captions.src', ['vtt']), lang: z.enum(['de', 'en']), label: z.string() })).default([]),
        textAlternative: z.string().optional(),
      }),
      z.object({ provider: z.enum(['youtube', 'vimeo']), id: z.string(), title: z.string() }),
    ], { error: 'Give either self-hosted "sources" with width and height, or a "provider" (youtube or vimeo) with an "id".' });

    const images = z.object({
      items: z.array(z.object({
        image: image(),
        alt: alt('embed.items.alt'),
        caption: z.string(),
        credit: z.string().optional(),
        scientific: z.boolean().default(false),
      })).min(2, { error: 'A gallery needs at least two images.' }),
    });

    const model3d = z.object({ src: publicFile('embed.src', ['glb']), description: description('embed.description'), placeholder: z.boolean().default(false) });

    const splat = z.object({
      src: publicFile('embed.src', ['spz', 'ply', 'splat', 'ksplat']).optional(),
      procedural: z.literal('fog-cloud').optional(),
      description: description('embed.description'),
      placeholder: z.boolean().default(false),
    }).refine((e) => Boolean(e.src) !== Boolean(e.procedural), { error: 'Give exactly one of "src" or "procedural".' });

    const canvas = z.object({
      module: z.string().regex(/^[a-z0-9-]+\.(js|ts)$/, { error: 'The file name of your sketch in the project folder, e.g. "sketch.js".' }).default('sketch.js'),
      aspect,
      description: description('embed.description'),
    });

    const webxr = z.discriminatedUnion('mode', [
      z.object({ mode: z.literal('inline'), scene: publicFile('embed.scene', ['glb']), description: description('embed.description') }),
      z.object({ mode: z.literal('external'), url: z.url(), platform: z.string(), description: description('embed.description') }),
    ], { error: 'embed.mode (webxr): "inline" (VR in the browser, with a scene .glb) or "external" (a link to a standalone build).' });

    const iframe = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('build'), src: publicFile('embed.src', ['html']), aspect, description: description('embed.description') }),
      z.object({
        kind: z.literal('pixelstreaming'),
        url: z.url().refine((u) => u.startsWith('https://'), { error: 'Pixel Streaming must use https://.' }),
        service: z.string({ error: 'Missing: the name shown in the notice, e.g. "HS KL Streaming-Server".' }),
        offline: z.object({ url: z.string(), label: z.string().optional() }).optional(),
        aspect,
        description: description('embed.description'),
      }),
    ], { error: 'embed.kind (iframe): "build" (a self-contained build in public/) or "pixelstreaming" (an Unreal stream URL).' });

    return z.discriminatedUnion('format', [
      base.extend({ format: z.literal('video'), embed: video }),
      base.extend({ format: z.literal('images'), embed: images }),
      base.extend({ format: z.literal('model3d'), embed: model3d }),
      base.extend({ format: z.literal('splat'), embed: splat }),
      base.extend({ format: z.literal('canvas'), embed: canvas }),
      base.extend({ format: z.literal('webxr'), embed: webxr }),
      base.extend({ format: z.literal('iframe'), embed: iframe }),
    ], { error: 'Choose one of video, images, model3d, splat, canvas, webxr, iframe.' })
      .refine((p) => !p.poster || Boolean(p.posterAlt), { error: 'Missing: describe the poster image.', path: ['posterAlt'] });
  },
});

// English text for a project. Only text fields; anything left out shows the German text instead.
const projectsEn = defineCollection({
  loader: glob({ pattern: '*/en.mdx', base: BASE, generateId: folderId }),
  schema: z.object({
    lang: z.literal('en', { error: 'en.mdx is the English version, so lang must be "en".' }).default('en'),
    title: z.string({ error: 'Missing in en.mdx.' }).max(60),
    hook: z.string({ error: 'Missing in en.mdx.' }).max(120, { error: 'Keep it under 120 characters.' }),
    lead: z.string({ error: 'Missing in en.mdx.' }),
    place: z.string().optional(),
    field: z.string().optional(),
    requirements: z.array(z.string()).optional(),
    coverAlt: z.string().optional(),
    posterAlt: z.string().optional(),
    question: z.object({
      title: z.string().optional(),
      text: z.string().refine((s) => words(s) <= 100, { error: 'Keep it to about 80 words.' }).optional(),
      source: z.object({ label: z.string(), url: z.url() }).optional(),
      figure: z.object({ alt: z.string().optional(), caption: z.string().optional() }).optional(),
    }).optional(),
    stage: z.object({ title: z.string().optional(), text: z.string().optional() }).optional(),
    method: z.string().optional(),
    results: z.string().optional(),
    design: z.string().optional(),
    embed: z.object({
      description: z.string().optional(),
      textAlternative: z.string().optional(),
      items: z.array(z.object({ alt: z.string().optional(), caption: z.string().optional() })).optional(),
    }).optional(),
  }),
});

export const collections = { projects, projectsEn };
