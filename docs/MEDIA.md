# Media guide

How to prepare images, video, 3D models, splats and builds for the hub. The goals: pages load fast on a phone, everyone can still clone the repository, and nothing is loaded from other servers ([PRIVACY.md](PRIVACY.md)).

## Where your files go

- Put every web-ready file in your project folder, next to the text: `src/content/projects/<slug>/`.
- Name files in lowercase with hyphens, without spaces or umlauts: `cover.jpg`, `flechte-mikroskop-01.jpg`, `interview-patrick.mp4`. See [CONTRIBUTING.md](../CONTRIBUTING.md).
- **Source files stay out of the repo:** `.blend`, `.psd`, `.aep`, raw footage, Unity and Unreal projects. Keep them in your group's own storage. The repo only holds what the website shows.

## Size limits

These are **proposed defaults, adjust with the team.** They exist because the published site on GitHub Pages may be at most 1 GB, shared by all groups, and because visitors on a phone pay for every megabyte.

| Type | Format | Proposed max | Notes |
|---|---|---|---|
| Cover image (required) | JPEG, 3:2, 2400 × 1600 px | 2 MB | Sizes from DESIGN.md 5.4 |
| Card crop (optional) | JPEG, 4:5, 1600 × 2000 px | 2 MB | |
| Inline and essay images | JPEG for photos, PNG for diagrams, plots and screenshots; 1600 px wide | 2 MB each | |
| Video poster | JPEG, same ratio as the video | 500 KB | |
| Video | MP4 (H.264 + AAC), max. 1080p | 80 MB per file | Optional second file: WebM (AV1 or VP9) |
| Captions | WebVTT (`.vtt`) | — | Required for videos with speech |
| Audio | M4A (AAC) or MP3 | 10 MB | |
| 3D model | GLB, compressed (Meshopt or Draco) | 10 MB | Textures max. 2048 px |
| Gaussian splat | `.spz` preferred, `.ply` allowed | 30 MB | |
| Canvas sketch | JavaScript module, libraries bundled | 500 KB gzipped | Loads only after the click |
| Iframe build (Unity etc.) | Folder with HTML, JS, WASM, data | 50 MB in total | |
| **Whole project** | everything in your folder | **100 MB** | Ask the maintainer if you need more |

Rule of thumb for video: one minute of 1080p H.264 is about 15–40 MB, depending on how much moves in the picture. A film longer than 3–4 minutes needs 720p, or a video platform with click-to-load (YouTube in privacy-enhanced mode, or Vimeo). Agree on that with the maintainer.

## Images

- Export **JPEG** (quality 85–90) for photos and **PNG** for graphics with sharp edges. Use the sRGB color profile.
- Export at the sizes in DESIGN.md 5.4, not much larger. **Don't convert to AVIF or WebP yourself.** The build makes AVIF and WebP versions in several sizes automatically.
- iPhone photos in **HEIC** must be converted to JPEG. The build can't read HEIC.
- **Remove location data (GPS)** from photos before you commit them. Everyone with access to the repository can read it.
- **Scientific images** (microscopy, data, maps) are shown unaltered: no filters, no color grading, no duplex, scale bars kept. Each one gets a caption with what it shows, the method or magnification, and a credit (DESIGN.md 5.2).
- **People:** don't publish photos or videos of people without their consent.
- **Speculative or AI-generated visuals** are labeled as such in the caption (DESIGN.md 5.1).

## Video

- Main file: **MP4 with H.264 video and AAC audio**. It plays everywhere.
- Optional smaller second file: **WebM with AV1 (or VP9) video and Opus audio**. Only add it if it saves a lot of space.
- Always add a **poster** image (the still shown before playback).
- Videos with speech need **captions** as a `.vtt` file, ideally in German and English (DESIGN.md 10).

With [HandBrake](https://handbrake.fr/) (free, with a graphical interface): choose a "Web" preset, then check resolution and file size. Or with ffmpeg in the terminal:

```sh
# MP4, H.264, max. 1080p, starts playing before it has fully downloaded
ffmpeg -i master.mov -vf "scale=-2:'min(1080,ih)'" -c:v libx264 -crf 23 -preset slow \
  -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart video.mp4

# Optional WebM, AV1 (if your ffmpeg has no libsvtav1, use: -c:v libvpx-vp9 -crf 33 -b:v 0)
ffmpeg -i master.mov -vf "scale=-2:'min(1080,ih)'" -c:v libsvtav1 -crf 35 -preset 6 \
  -c:a libopus -b:a 96k video.webm

# Poster from second 5
ffmpeg -ss 5 -i video.mp4 -frames:v 1 -q:v 2 poster.jpg
```

A higher `-crf` value makes the file smaller and the picture softer.

## 3D models

- Format: **GLB** (binary glTF, one file with geometry, materials and textures).
- Textures max. 2048 px; 1024 px is often enough. Aim for under 200,000 triangles; phones struggle long before a million.
- Compress every model before you commit it:

```sh
npx @gltf-transform/cli optimize model.glb model-web.glb --compress meshopt --texture-compress webp
npx @gltf-transform/cli inspect model-web.glb   # shows size, triangles, textures
```

- **Meshopt** is the default. It also compresses animations. Use `--compress draco` only if the hub's 3D viewer asks for it. Either way, the viewer needs a matching decoder, and it must be served from the site, never from a CDN.
- The command merges meshes to make the model faster. If you need separately named parts (animation, clickable parts), add `--join false --flatten false` and check the result.
- `npm run make:model` creates a placeholder model for testing.

## Gaussian splats

- Format: **`.spz`** (compressed, much smaller than the same scene as `.ply`). `.ply` works but is large.
- Before export, crop away floaters (stray blobs) and background you don't need, for example in [SuperSplat](https://superspl.at/editor) (free, in the browser). Check its current docs for export formats.
- Fewer splats load faster. Test on a phone.

## Where large files go: Git LFS

**Recommendation: Git LFS for video, audio, 3D models, splats and build files. Images stay in normal Git.**

Git LFS (Large File Storage) keeps big files on GitHub's LFS storage and puts only a small "pointer" text file in the Git history. Why this and not external hosting:

- **Privacy:** the files are still built into the site and served from the same domain. No third-party requests, no allowlist exception. External hosting would load media from another domain, which the privacy rules forbid on page load.
- **One place:** media are versioned and reviewed in the same pull request as the text.
- **Fast clones:** without LFS, every old version of every video stays in the history forever, and GitHub blocks files over 100 MB.

What you need to do:

1. Install Git LFS once: `git lfs install`. (GitHub Desktop includes it.)
2. Commit as usual. The `.gitattributes` file in the repo root decides which file types go to LFS. If it's missing, ask the maintainer before committing large files. The maintainer sets it up once, for example:

   ```sh
   git lfs track "*.mp4" "*.webm" "*.m4a" "*.mp3" "*.glb" "*.spz" "*.ply" "*.wasm" "*.data" "*.unityweb"
   ```

3. Re-commit a large file only when it really changed. Every version stays in LFS storage.

Things the maintainer must watch:

- **CI must check out with LFS enabled** (`lfs: true` in `actions/checkout`). Without it, the site still builds, but videos and models are replaced by tiny pointer files and don't play.
- **Quotas:** LFS storage and monthly download bandwidth are limited and count against the account that owns the repo. Every clone and every CI run downloads the LFS files. At the time of writing, free accounts get 10 GiB of storage and 10 GiB of bandwidth per month. Check the current numbers in GitHub's billing settings before the semester starts, and consider caching LFS files in CI.

## Export guides

Menus change between versions. Where this guide and the tool's current docs disagree, the docs win.

### Blender → GLB

1. **Prepare:** apply transforms (Object > Apply > All Transforms). Work in real-world scale (1 unit = 1 m). Put the origin at the base of the object. Delete hidden and unused objects.
2. **Materials:** use the Principled BSDF with image textures. Procedural textures and most other shader nodes don't export. Bake them to image textures first.
3. **Export:** File > Export > glTF 2.0 (.glb/.gltf).
   - Format: **glTF Binary (.glb)**
   - Include: "Selected Objects" if the scene has more than the model; cameras and lights usually off
   - Transform: **+Y Up** on
   - Mesh: **Apply Modifiers** on
   - Compression: off (you compress in the next step)
   - Animation: only if the model is animated
4. **Compress** with the `gltf-transform` command above and check the result in the dev server.

### Unity → Web build (iframe format)

1. Platform: **Web** in Unity 6 (File > Build Profiles), **WebGL** in older versions (File > Build Settings).
2. Player Settings > Resolution and Presentation: Web template **Minimal**. Never **PWA**: it adds a service worker.
3. Player Settings > Publishing Settings:
   - Compression Format: **Brotli** (smallest) or Gzip
   - **Decompression Fallback: on.** GitHub Pages can't send the server headers that compressed builds otherwise need.
   - **Data Caching: off.** It stores the build in the browser's IndexedDB, which breaks the privacy rules.
4. Other Settings > Optimization: **Strip Engine Code** on, Managed Stripping Level Medium or High. Test afterwards: high stripping can remove code your scripts need.
5. Turn off Unity Analytics, Cloud Diagnostics, ads and other online services. A build must not contact Unity's servers. Check the Network tab ([PRIVACY.md](PRIVACY.md)).
6. Keep textures at max. 2048 px and compress audio. The Editor log lists the biggest assets after each build.
7. A Web build doesn't run from a double-clicked file. Test it with "Build And Run" or in the dev server, and on a phone. If it is too heavy for phones, provide a video walkthrough.

### Unreal → video, GLB or Pixel Streaming

Unreal Engine 5 can't build for the browser. Choose one of these:

- **Video (simplest):** render with the Movie Render Queue (Movie Render Graph in newer versions) to an image sequence or ProRes, then encode MP4/WebM as above. Use the `video` format.
- **Export assets as GLB:** with Epic's glTF Exporter (in the Content Browser, right-click an asset > Asset Actions > Export, choose `.glb`; check the current docs for your version). Keep the default scale of 0.01, which converts Unreal's centimeters to meters. Unreal materials only partly carry over, so check the result and simplify. Then compress with `gltf-transform` and use the `model3d` format.
- **Pixel Streaming (live, interactive):** the app runs on a server with a graphics card and streams video to the browser. It costs money while it runs and needs a privacy exception, a notice and an offline video fallback. Read the Pixel Streaming section in [PRIVACY.md](PRIVACY.md) and talk to the maintainer first. Newer engine versions ship "Pixel Streaming 2"; check the current docs.
- **Standalone VR builds** (for example for Quest) can't run on the hub. Present them with the `external` format: poster, requirements and a video walkthrough.

### TouchDesigner → video (the web is not a target)

TouchDesigner has no export that runs in a browser. Plan for one of these:

- **Render to video:** record with the Movie File Out TOP to a high-quality codec your system offers (for example ProRes on macOS) or an image sequence. Then encode MP4/WebM as above. Note: the free Non-Commercial license limits output resolution (1280 × 1280 at the time of writing; check the current license terms).
- **Rebuild for the browser:** export the data, textures or geometry your piece uses and rebuild the interactive part as a `canvas` sketch (p5.js or three.js). Check the Derivative forum for current workflows.
- **Document an installation** with photos and video, using the `images` or `video` format.
- A live connection from a running TouchDesigner machine to the browser follows the same rules as Pixel Streaming. Talk to the maintainer first.
