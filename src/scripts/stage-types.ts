// Contract between the shared Stage (stage.ts) and each format module (formats/<format>.ts).
// A format module exports `mount`. The Stage calls it after the visitor clicks "Start",
// shows a loading bar while it runs, and calls the returned cleanup when the visitor stops.

export type StageContext<C = Record<string, unknown>> = {
  /** Config written by the format's Astro component into <script type="application/json" data-stage-config> */
  config: C;
  lang: 'de' | 'en';
  /** Aborted when the visitor stops before loading finished: pass it to fetch() and check it after awaits */
  signal: AbortSignal;
  /** prefers-reduced-motion: no autoplay animation, no camera moves */
  reducedMotion: boolean;
  /** Loading progress from 0 to 1, or null for "busy, unknown how long" */
  progress: (fraction: number | null) => void;
};

/** root already contains a clone of the format's <template data-stage-template>, if it has one. */
export type MountFn<C = Record<string, unknown>> = (root: HTMLElement, ctx: StageContext<C>) => Promise<void | (() => void)>;
