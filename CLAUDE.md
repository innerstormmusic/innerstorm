# innerstorm

> **HARD RULE: never create, modify, move or delete any file outside this project folder
> (`/Users/thomas/Sites/innerstormmusic`).** Reading outside it is fine. Writing is not. That covers
> temp/scratch dirs, global configs, `~/.ssh`, and the original old-site folder/repo. Anything needed
> from outside gets copied *into* this folder (e.g. `docs/`), and only the copy is used.

Website for **innerstorm**, the owner's own music. Its main purpose is to offer download links to MP3 files.

- Live site: https://music.bertouk.com
- Repo: `git@github.com:innerstormmusic/innerstorm.git`, default branch `main`

## Hosting & deploys

- Hosted on **Cloudflare Workers**, connected to the GitHub repo through Workers Builds.
- Every push to `main` triggers a build and deploys to music.bertouk.com. So pushing to `main` is a
  production deploy.
- Cloudflare build settings: build command `npm run build`, deploy command `npx wrangler deploy`.
  Node version comes from `.nvmrc`.
- `wrangler.jsonc`: static assets with SPA fallback; only `/api/*` runs the Worker (`run_worker_first`).
  The `name` must match the Worker's name in the dashboard.
- The build uses `@cloudflare/vite-plugin`: output goes to `dist/client` (assets) and `dist/innerstorm`
  (Worker plus a generated `wrangler.json` that `wrangler deploy` picks up automatically).

## Track list (live from Google Drive)

- `worker/index.ts` serves `GET /api/tracks`. It lists the MP3s (`audio/mpeg`) in a Drive folder shared as
  "Anyone with the link", newest first, through the Drive API v3 with an API key.
- Config: `DRIVE_FOLDER_ID` is a var in `wrangler.jsonc`. `GOOGLE_API_KEY` is a **secret**, set in the
  Cloudflare dashboard (Worker → Settings → Variables and Secrets), and locally in `.dev.vars`
  (gitignored, template in `.dev.vars.example`).
- Caching: Cloudflare edge cache 10 min (`s-maxage`), browser 1 min. A new upload can take up to ~10 min to show.
- File names follow `artist - track name.mp3`. They're split on the first ` - ` into artist and title.
- Download links: `https://drive.google.com/uc?export=download&id=<id>`. Drive shows a "can't scan for viruses"
  page for files over ~100 MB; that's expected. Moving the files to R2 is a possible later step.
- `shared/track.ts` holds the `Track` type used by both the Worker and the React app.
- After changing `wrangler.jsonc` vars or secrets, run `npm run cf-typegen` to regenerate
  `worker-configuration.d.ts` (committed, because `tsc -b` needs it in the Cloudflare build).

## Stack

- React 19 + Vite + TypeScript (scaffolded from Vite's `react-ts` template), plain CSS (no Tailwind)
- Cloudflare Worker (TypeScript) for `/api/*`
- Icons: `lucide-react` (download icon); social icons are SVGs in `src/assets/icons`, used as CSS masks
- Linting: oxlint (`.oxlintrc.json`)

## Commands

```sh
npm run dev         # Vite dev server; the Worker runs inside it too (/api/tracks works locally)
npm run build       # type-check (tsc -b: app + worker) + production build into dist/
npm run preview     # serve the built site + Worker locally
npm run lint        # oxlint
npm run cf-typegen  # regenerate worker-configuration.d.ts from wrangler.jsonc / .dev.vars
```

## Layout

- `index.html`: Vite entry (favicons, manifest, Raleway from Google Fonts)
- `src/App.tsx`: page: logo, tracks panel, social links
- `src/components/`: `LogoType` (animated wordmark), `TrackList`, `SocialLinks`
- `src/index.css`: all styles, with colour tokens on `:root`
- `src/assets/`: `poly.jpg` background, social icons
- `public/`: favicons and `site.webmanifest`
- `worker/`: Cloudflare Worker (API)
- `shared/`: types shared by the app and the Worker
- `docs/`: **gitignored**, local reference only (e.g. `docs/old site/innerstorm`, the private old site).
  Read-only: never edit anything in it.

## Design

Carried over from the old site (`docs/old site/innerstorm`): black base, Raleway, light grey (zinc) text.
The `poly.jpg` background sits behind a darkening overlay. The page has the ˈɪnəstɔːm outline wordmark, which
draws in through stroke-dashoffset (`pathLength=1` on each shape), a frosted-glass panel for the list, rows in
the old playlist style, and glowing social icons. Animations respect `prefers-reduced-motion`.

## Roadmap

1. **Iteration 1 (current):** list the MP3 files with download links, live from a Google Drive folder.
2. Later iterations: to be defined.

## Repo notes

- Pushes authenticate with the `innerstormmusic` SSH key (`~/.ssh/id_ed25519`), set per repo through
  `git config core.sshCommand`. The default `id_rsa` key belongs to a different GitHub account that has no
  access.
- In the owner's shell, `git` is wrapped by a shell function (scm_breeze) that errors. Use `command git ...`.
- `rm` is aliased to `rm -i`, so it hangs waiting for a prompt. Use `command rm`.
- Keep tooling writes inside the repo: run npm/npx/wrangler with
  `npm_config_cache=$PWD/.local/npm-cache XDG_CONFIG_HOME=$PWD/.local/config TMPDIR=$PWD/.local/tmp WRANGLER_SEND_METRICS=false`
  (`.local/` is gitignored). For headless Chrome screenshots, use `--user-data-dir=$PWD/.local/chrome`.
