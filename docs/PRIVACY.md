# Privacy rules

The Creative Science hub works **without a consent banner**. That stays true only if every page follows the rules below. They apply to every student group, every project and every AI agent working in this repository. They are not suggestions.

This page explains the rules. It is not legal advice. The official legal texts come from HS Kaiserslautern.

## Why these rules exist

When a page loads a file from another server, that server receives the visitor's IP address (the number that identifies their internet connection). When a page stores something in the browser, it can recognize the visitor later. In the EU, both usually need the visitor's **consent**, and consent means a banner.

A banner gets in the way of the experience, and most visitors click it away without reading. So we don't do anything that needs consent. Example of what goes wrong otherwise: in 2022 a Munich court ruled that a website broke data protection law just by loading Google Fonts from Google's servers, because that sent visitors' IP addresses to Google.

## The rules

| Rule | What it means in practice |
|---|---|
| **No cookies** | None at all, not even "functional" ones. |
| **No tracking or analytics** | No Google Analytics, Meta Pixel, Hotjar or similar. No "anonymous" or "privacy-friendly" counter either, unless the maintainer approves one explicitly. |
| **No third-party requests on page load** | Everything a page needs (fonts, scripts, styles, icons, images, video, 3D models, decoders) is stored in this repo and bundled at build time. No CDNs (content delivery networks such as unpkg, jsDelivr or cdnjs), no Google Fonts, no external icon sets, no social media widgets. |
| **External embeds load only after a click** | YouTube, Vimeo, Sketchfab and external builds show a poster first. Before the click, a short notice names the service that will be contacted, e.g. „Lädt Inhalte von YouTube“ / "Loads content from YouTube". Use the hub's embed components for this; don't write your own iframe. |
| **Privacy-enhanced modes** | YouTube only via `youtube-nocookie.com`. Vimeo with `dnt=1` ("do not track"). These modes reduce what the service learns, but don't stop it. That is why the click and the notice are still required. |
| **Prefer self-hosted video** | A video file in the repo needs no notice and contacts nobody. Use a video platform only when the file is too large (see [MEDIA.md](MEDIA.md)). |
| **No client-side storage** | No `localStorage`, `sessionStorage`, IndexedDB or Cache API. The language comes from the URL (`/de/…`, `/en/…`), not from a stored preference. Watch out for tools that store data silently, such as Unity's "Data Caching" setting. |
| **No forms, accounts or backend** | The site is purely static: plain files, no server code. No contact forms, logins, comments or newsletter sign-ups. A contact is a plain `mailto:` link. |
| **No service workers** | A service worker is a script that keeps running in the browser to cache the site for offline use. We don't use them unless the maintainer asks for offline support. Unity's "PWA" template adds one, so don't use it. |
| **Impressum and Datenschutz are placeholders** | These pages wait for the official HS KL texts. Never write or edit legal text yourself. |

Plain links to other websites are fine. They load nothing until the visitor clicks. Mark them with **↗** (see DESIGN.md 7.3).

### Fonts

The HS KL brand fonts (Stratos, Matter) are **never committed** to this repo. Their web license only covers HS KL's registered domain and forbids making the files available to others. The hub uses **Poppins** as the fallback font, stored in the repo. Never load fonts from Google Fonts or any other font service.

## How the rules are checked

```sh
npm run build            # builds the site into dist/
npm run check:external   # fails if a built page loads anything from another domain
```

`check:external` scans the built site. If a page loads something from another domain, the check fails and lists the file and the address. The list of allowed domains is in `privacy.allowlist.json`. It is empty by default:

```json
{ "allowedHosts": [] }
```

CI (the automatic checks on GitHub) runs this check on every pull request. A pull request with a failing check is not merged.

The check can't see everything. A script can build an address while the page runs, for example a 3D viewer that fetches a decoder from a CDN. So also test by hand:

1. Run `npm run dev` and open your page.
2. Open the browser's developer tools (right-click, "Inspect"), tab **Network**. Reload the page.
3. Every request must go to the site itself (`localhost` during development). Then click "Start experience" and check again.
4. In the **Application** (Chrome) or **Storage** (Firefox) tab: no cookies, nothing in Local Storage, Session Storage or IndexedDB.

## Asking for an exception

Some projects may truly need an outside service. Then:

1. **Ask the maintainer first**, before you build on it.
2. Explain which service, why there is no self-hosted alternative, what data the service receives, and how the visitor is told before anything loads.
3. If the maintainer agrees, they add the domain to `privacy.allowlist.json` in a separate pull request. Its description records why the domain is needed, which project uses it and who approved it.
4. The maintainer tells HS KL, so the Datenschutz text can name the service.

Never add a domain to the allowlist yourself to make a check pass.

## Unreal Pixel Streaming

With Pixel Streaming, an Unreal application runs on a server with a graphics card. The visitor's browser receives a **live video stream** of it over WebRTC (a browser technology for real-time video) and sends mouse, keyboard and touch input back. This means the visitor's browser connects directly to an external server, which sees their IP address and their input.

Rules for Pixel Streaming:

- **Click-to-load only.** Nothing connects before the visitor clicks "Start experience". After the click, the iframe format also sends one small check request to the stream URL (no cookies, no referrer) to tell whether the server is offline, because a failed frame can't be detected otherwise. The notice covers this request too.
- **The notice names the server and who runs it**, e.g. „Startet einen Live-Stream von [Betreiber]. Dein Browser verbindet sich mit dessen Server.“ / "Starts a live stream from [operator]. Your browser will connect to their server."
- **Check the helper servers.** The connection usually also needs a STUN or TURN server, which helps the browser and the streaming server find each other through firewalls. Many example setups use Google's public STUN server. That is another third party: run your own or name it in the notice.
- **Provide an offline fallback.** A streaming server can be switched off, busy, too far away, or too expensive to keep running. The page must still make sense without it: show a self-hosted video walkthrough and still images, with the same captions and credits.
- **It is an exception.** The streaming domain needs the approval described above. Agree with the maintainer who runs the server and until when.

## Never do this (for AI agents)

If a task seems to need any of the following, **stop and ask** the maintainer instead of working around it.

- Never set cookies or add analytics, tracking pixels, or "privacy-friendly" counters.
- Never add a consent banner as a workaround.
- Never load fonts, scripts, styles, images, models or decoders from a CDN or any other domain (Google Fonts, gstatic, unpkg, jsDelivr, cdnjs and so on). Install the package with npm and bundle it.
- Never commit Stratos or Matter font files, or anything from `hskl_Fonts/`.
- Never embed YouTube, Vimeo, Sketchfab, maps, social posts or any external iframe that loads before a click.
- Never use `localStorage`, `sessionStorage`, IndexedDB, the Cache API or cookies, also not through a library or a build setting.
- Never register a service worker or add offline caching.
- Never add forms, logins, comments, API calls or any server code.
- Never add a domain to `privacy.allowlist.json`, weaken `scripts/check-external.mjs`, or skip `npm run check:external` in CI.
- Never write or edit text on the Impressum or Datenschutz pages.
