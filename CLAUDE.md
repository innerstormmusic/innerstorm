# innerstorm

Website for **innerstorm**, the owner's own music. Its main purpose is to offer download links to MP3 files.

- Live site: https://music.bertouk.com
- Repo: `git@github.com:innerstormmusic/innerstorm.git`, default branch `main`

## Hosting & deploys

- Hosted on **Cloudflare Pages**, connected to the GitHub repo.
- Every push to `main` triggers a build and deploys to music.bertouk.com. So pushing to `main` is a
  production deploy.
- Cloudflare build settings: build command `npm run build`, output directory `dist`, Node version from `.nvmrc`.
- The site is mostly static. No backend for now.

## Stack

- React 19 + Vite + TypeScript (scaffolded from Vite's `react-ts` template)
- Linting: oxlint (`.oxlintrc.json`)

## Commands

```sh
npm run dev      # dev server
npm run build    # type-check (tsc -b) + production build into dist/
npm run preview  # serve the built dist/ locally
npm run lint     # oxlint
```

## Layout

- `index.html`: Vite entry
- `src/main.tsx`: mounts React into `#root`
- `src/App.tsx`: page content
- `src/index.css`: global styles

## Design

Minimal: black background, white text, large monospace type (system monospace stack), content centered.

## Roadmap

1. **Iteration 1 (current):** list the MP3 files with download links. The files are hosted on a
   Google Drive the owner fully controls, so the links point to Drive.
2. Later iterations: to be defined.

## Repo notes

- Pushes authenticate with the `innerstormmusic` SSH key (`~/.ssh/id_ed25519`), set per repo through
  `git config core.sshCommand`. The default `id_rsa` key belongs to a different GitHub account that has no
  access.
- In the owner's shell, `git` is wrapped by a shell function (scm_breeze) that errors. Use `command git ...`.
