// Loads projects for one language. English pages use en.mdx where it exists and fall back to
// the German text field by field; every text comes with the language it is actually written in.
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/routes';

export type Project = CollectionEntry<'projects'>;
export type Translation = CollectionEntry<'projectsEn'>;
/** A piece of text and the language it is written in (for the lang attribute). */
export type Text = { text: string; lang: Lang };

export type LocalProject = {
  slug: string;
  entry: Project;
  translation?: Translation;
  /** true when this English page shows (some) German text */
  fallback: boolean;
  title: Text;
  hook: Text;
  lead: Text;
  place?: Text;
  field: Text;
  requirements: Text[];
  coverAlt: Text;
  posterAlt?: Text;
  question: { title: Text; text: Text; source?: { label: string; url: string }; figure?: { alt: Text; caption: Text } };
  stage?: { title: Text; text: Text };
  method?: Text;
  results?: Text;
  design?: Text;
};

const showDrafts = import.meta.env.DEV;

/** Published projects (drafts too in `npm run dev`). Unlisted samples only with includeUnlisted. */
export async function getProjects(lang: Lang, { includeUnlisted = false } = {}): Promise<LocalProject[]> {
  const entries = await getCollection('projects', (p) =>
    (showDrafts || p.data.status === 'published') && (includeUnlisted || p.data.listed));
  const translations = lang === 'en' ? await getCollection('projectsEn') : [];
  return entries
    .sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title))
    .map((entry) => localize(entry, lang, translations.find((t) => t.id === entry.id)));
}

export async function getProject(lang: Lang, slug: string): Promise<LocalProject | undefined> {
  return (await getProjects(lang, { includeUnlisted: true })).find((p) => p.slug === slug);
}

function localize(entry: Project, lang: Lang, translation?: Translation): LocalProject {
  const d = entry.data;
  const en = lang === 'en' ? translation?.data : undefined;
  let fallback = false;
  // Pick the English text when there is one, otherwise the German one (and remember the fallback).
  const pick = (german: string, english?: string): Text => {
    if (lang === 'de') return { text: german, lang: 'de' };
    if (english) return { text: english, lang: 'en' };
    fallback = true;
    return { text: german, lang: 'de' };
  };
  const pickOptional = (german?: string, english?: string) => (german ? pick(german, english) : undefined);

  const project: LocalProject = {
    slug: entry.id,
    entry,
    translation,
    fallback: false,
    title: pick(d.title, en?.title),
    hook: pick(d.hook, en?.hook),
    lead: pick(d.lead, en?.lead),
    place: pickOptional(d.place, en?.place),
    field: pick(d.field, en?.field),
    requirements: d.requirements.map((r, i) => pick(r, en?.requirements?.[i])),
    coverAlt: pick(d.coverAlt, en?.coverAlt),
    posterAlt: pickOptional(d.posterAlt, en?.posterAlt),
    question: {
      title: pick(d.question.title, en?.question?.title),
      text: pick(d.question.text, en?.question?.text),
      source: en?.question?.source ?? d.question.source,
      figure: d.question.figure && {
        alt: pick(d.question.figure.alt, en?.question?.figure?.alt),
        caption: pick(d.question.figure.caption, en?.question?.figure?.caption),
      },
    },
    stage: d.stage && { title: pick(d.stage.title, en?.stage?.title), text: pick(d.stage.text, en?.stage?.text) },
    method: pickOptional(d.method, en?.method),
    results: pickOptional(d.results, en?.results),
    design: pickOptional(d.design, en?.design),
  };
  project.fallback = fallback;
  return project;
}

/** Embed texts (description, text alternative, gallery captions) in the page language, with fallback. */
export function embedText(p: LocalProject, lang: Lang, field: 'description' | 'textAlternative', german?: string): Text | undefined {
  if (!german) return undefined;
  const english = lang === 'en' ? p.translation?.data.embed?.[field] : undefined;
  return lang === 'en' && english ? { text: english, lang: 'en' } : { text: german, lang: 'de' };
}
