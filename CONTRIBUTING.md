# Contributing

Each student group adds one project to the hub. You can do this in two ways:

- **A. Work in Git yourself** (recommended). You get a live check of your work and full control.
- **B. Hand your material to the maintainer**, who adds it for you.

Both ways end in the same place: a pull request that is reviewed and then merged into `main`.

## Before you start

- A GitHub account. Send your username to the maintainer.
- [Git](https://git-scm.com/) and [Git LFS](https://git-lfs.com/) (for large files, see [docs/MEDIA.md](docs/MEDIA.md)). Run `git lfs install` once after installing. If you prefer an app to the terminal, [GitHub Desktop](https://desktop.github.com/) can do every step below and includes Git LFS.
- Node.js, to run the site on your computer. See the quick start in [README.md](README.md).
- Your project's **slug**, agreed with the maintainer. The slug is the short name used in the URL, the folder and the branch, e.g. `leben-aus-nebel`.

## A. The Git workflow, step by step

A **branch** is your group's own copy of the project, where you can work without affecting anyone else. A **pull request (PR)** asks to merge your branch into `main`, the version that gets published.

1. **Get access.** Either the maintainer adds you as a collaborator on the repository (preferred), or you **fork** it: on GitHub, click "Fork" to get your own copy, and work there.
2. **Clone** the repository to your computer and install it. Copy the URL from the green "Code" button on GitHub.
   ```sh
   git clone <repo-url>
   cd heritomics-scaffold
   npm install
   ```
3. **Create your group's branch.** Do this once per group.
   ```sh
   git switch main
   git pull
   git switch -c group/<slug>
   ```
   If a teammate already created it, use `git switch group/<slug>` instead.
4. **Work.** Add or change files in your project folder `src/content/projects/<slug>/`. Run `npm run dev` and look at your page in the browser.
5. **Commit** your changes, small and often:
   ```sh
   git add src/content/projects/<slug>
   git commit -m "Add cover image for leben-aus-nebel"
   ```
6. **Push** your branch to GitHub:
   ```sh
   git push -u origin group/<slug>   # the first time
   git push                          # after that
   ```
7. **Open a pull request.** GitHub shows a "Compare & pull request" button after you push. Base: `main`. Compare: `group/<slug>`. Fill in the checklist. You can open it early as a **draft** to get feedback.
8. **Wait for the checks.** CI (the automatic checks on GitHub) builds the site and runs the checks on every PR. If one fails, click "Details" to see why, fix it, commit and push again.
9. **Review.** The maintainer reviews your PR. Answer comments by pushing new commits to the same branch.
10. **Merge.** When the review is done and the checks pass, the maintainer merges the PR into `main`. Every change on `main` is built and published automatically.
11. **Keep up to date with `main`**, especially before opening a PR:
    ```sh
    git switch group/<slug>
    git fetch origin
    git merge origin/main
    git push
    ```
    If you work in a fork, add the original repository once with `git remote add upstream <original-repo-url>`, then use `git fetch upstream` and `git merge upstream/main` instead.
12. **Keep working after a merge** on the same branch, and open a new PR for the next round.

### Stay in your folder

- Change only your own project folder. If you need a change to shared files (components, styles, layout, the content schema, configs, docs), ask the maintainer first and make it in a separate PR. The design tokens in `src/styles/tokens.css` never change without asking.
- Never commit: `node_modules/`, `dist/`, `.env` files, font files (Stratos, Matter, anything from `hskl_Fonts/`), source files such as `.blend` or `.psd`, or personal data.

## B. Hand your material to the maintainer

If your group doesn't want to use Git, send the maintainer one complete package through the agreed shared folder (not by email for large files):

- The text in German, and in English if you have it, following [docs/CONTENT.md](docs/CONTENT.md).
- The cover image with alt text, and all other media prepared as in [docs/MEDIA.md](docs/MEDIA.md).
- Credits, sources, and the name of the scientist who checked the scientific statements.
- Confirmation that everyone shown in photos or videos has agreed to be published.

The maintainer creates the branch and the PR. You still review the result, and the same checklist applies.

## Naming conventions

| What | Rule | Example |
|---|---|---|
| Project slug | lowercase, words joined with hyphens, letters a–z and digits only. Write ä → ae, ö → oe, ü → ue, ß → ss. | `kaelte-als-zuhause` |
| Project folder | the slug | `src/content/projects/kaelte-als-zuhause/` |
| Branch | `group/` + slug | `group/kaelte-als-zuhause` |
| File names | lowercase, hyphens, no spaces, no umlauts, no special characters. Number with leading zeros. | `cover.jpg`, `flechte-mikroskop-01.jpg` |
| Text files | `index.mdx` (German, all fields), `en.mdx` (English text only) | |

Why so strict: file names become web addresses. Your Mac or Windows laptop treats `Cover.JPG` and `cover.jpg` as the same file, but the build server doesn't. Spaces and umlauts break links in some tools.

## Commit messages

Write a short line in English, in the imperative ("Add", not "Added"), that says what changed and for which project:

- `Add cover image for leben-aus-nebel`
- `Fix typo in kaelte-als-zuhause hook`
- `Translate im-dunkeln-wachsen into English`
- `Compress 3D model for kaelte-als-zuhause`

Avoid messages like `update`, `stuff` or `final v2`. One change per commit makes it easy to undo a single step.

## What reviewers check

Every PR gets the checklist from [.github/pull_request_template.md](.github/pull_request_template.md): the design guide, alt texts, scientific images, file sizes, both languages, phone and keyboard tests, captions, scientific accuracy, consent, and privacy.

Run the automatic checks yourself before you push. The checks look at the built site, so build first:

```sh
npm run build
npm run check:external   # nothing loaded from other domains (docs/PRIVACY.md)
npm run check:budgets    # home and index pages stay small and fast
```

Also run `npm run validate` (content, image sizes, alt texts) and, after `npm run build`, `npm test` (browser tests).

## Questions

Ask the maintainer. If you are an AI agent and a rule here or in [docs/DESIGN.md](docs/DESIGN.md) or [docs/PRIVACY.md](docs/PRIVACY.md) seems to block your task, stop and ask instead of working around it.
