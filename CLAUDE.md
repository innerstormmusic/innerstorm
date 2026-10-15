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

## Music (R2 bucket, read from the MP3 tags)

- The MP3s live in the private R2 bucket `innerstorm-media`, bound to the Worker as `MEDIA` (`wrangler.jsonc`).
  Its top-level folders are the site's sections: `tracks/`, `mixes/`, `calendar/` (`SECTIONS` in
  `shared/track.ts`). Files in subfolders belong to their top-level folder; anything else is ignored.
- There is no playlist JSON. Everything shown comes from the files' **ID3 tags**, read by the Worker with
  `music-metadata`: title, artist, album, genre, year, track number, embedded cover. Files without a title
  tag fall back to their name, `artist - title.mp3`. The artist "innerstorm" is always shown lowercase.
- Order within a section: tracks newest year first, mixes oldest year first, both then by title; the calendar by track
  number (`TRCK`). Missing values come last. Files the lists leave out (empty, nameless, not MP3) are sent
  as `skipped` and logged as warnings in the browser console.
- The Worker never downloads whole MP3s for this. `worker/tags.ts` reads the 10-byte ID3 header, then only
  the tag plus ~16 KB of audio. Length = audio bytes x 8 / bitrate for CBR files; VBR files use the
  Xing/VBRI header. Parsed tags are cached per file version (R2 etag) in the Cache API, so a file is
  only parsed again after it's replaced.
- Endpoints (`worker/index.ts`):
  - `GET /api/tracks`: the whole list; edge cache 5 min, browser 1 min. A new upload can take up to
    ~5 min to show.
  - `GET /api/cover/<key>?v=<etag>`: the embedded cover, cached as immutable.
  - `GET /media/<key>`: streams the MP3 from R2 with HTTP Range support (seeking); `?download` adds
    `Content-Disposition: attachment`. Only `*.mp3` keys inside the section folders are served.
- After changing bindings in `wrangler.jsonc`, run `npm run cf-typegen` to regenerate
  `worker-configuration.d.ts` (committed, because `tsc -b` needs it in the Cloudflare build).
- Local dev uses Wrangler's local R2 emulation (`.wrangler/state`), not the real bucket.
  `docs/samples/` mirrors the live bucket (`tracks/`, `mixes/`, `calendar/` with real, tagged MP3s);
  `npm run seed:local` (`scripts/seed-local-r2.sh`) rebuilds the local bucket from it and clears the
  local cache. Restart `npm run dev` afterwards.

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
npm run cf-typegen  # regenerate worker-configuration.d.ts from wrangler.jsonc
npm run seed:local  # rebuild the local R2 bucket from docs/samples
```

## Layout

- `index.html`: Vite entry (favicons, manifest, Raleway from Google Fonts)
- `src/App.tsx`: the page: full-height sections Home, Tracks, Mixes, Calendar, About (as on the old site)
- `src/player/`: `PlayerProvider` owns the page's single `<audio>` element (queue, next/previous with
  wrap-around, auto-advance, volume, Media Session); components use `usePlayer()` from `context.ts`
- `src/components/`: `Section`, `Playlist` (rows), `CalendarGrid` (cover cards), `Player` (bottom bar,
  progress bar, no waveform; its cover opens `CoverLightbox`), `SectionNav`, `TrackCover`, `TracksStatus`, `LogoType` (animated wordmark), `SocialLinks`
- `src/hooks/useTracks.ts`: loads `/api/tracks` once; sections filter their part
- Scrolling: CSS scroll snapping (`mandatory` on desktop, `proximity` on phones) does keys and anchor links.
  `src/hooks/useWheelPaging.ts` makes one wheel gesture (notch, or trackpad swipe with momentum) move
  exactly one section; over a scrollable list the wheel only scrolls the list, never the page. `SectionNav` has the dot menu, marks the
  section in view, and jumps to the URL's `#section` on load.
- `src/index.css`: all styles, with colour tokens on `:root`
- `src/assets/`: section backgrounds (`backgrounds/`), social icons
- `public/`: favicons and `site.webmanifest`
- `worker/`: Cloudflare Worker: `index.ts` (routes, list, covers), `tags.ts` (ID3 reading), `media.ts` (Range streaming)
- `shared/`: types shared by the app and the Worker
- `docs/`: **gitignored**, local reference only (e.g. `docs/old site/innerstorm`, the private old site).
  Read-only: never edit anything in it.

## Design

Carried over from the old site (`docs/old site/innerstorm`): black base, Raleway, light grey (zinc) text.
Each section sits over its own blurred, darkened background (home: `poly.jpg`, tracks: `tomtom.jpg`, mixes:
`tom3_1.jpg`, calendar: `innerstorm.jpeg`, about: `magic1.jpg`). The home section has the ˈɪnəstɔːm outline
wordmark, which draws in through stroke-dashoffset (`pathLength=1` on each shape), and glowing social icons.
Lists sit in frosted-glass panels with rows in the old playlist style; calendar mixes are cover cards. The
player is a glass bar fixed to the bottom. Animations respect `prefers-reduced-motion`.

## Roadmap

1. ~~Iteration 1: list MP3s with download links from Google Drive~~ (replaced: Drive can't stream).
2. **Iteration 2 (current):** MP3s in R2, list built from ID3 tags, streaming player, old-site sections.
3. Later iterations: to be defined.

## Repo notes

- Pushes authenticate with the `innerstormmusic` SSH key (`~/.ssh/id_ed25519`), set per repo through
  `git config core.sshCommand`. The default `id_rsa` key belongs to a different GitHub account that has no
  access.
- In the owner's shell, `git` is wrapped by a shell function (scm_breeze) that errors. Use `command git ...`.
- `rm` is aliased to `rm -i`, so it hangs waiting for a prompt. Use `command rm`.
- Keep tooling writes inside the repo: run npm/npx/wrangler with
  `npm_config_cache=$PWD/.local/npm-cache XDG_CONFIG_HOME=$PWD/.local/config TMPDIR=$PWD/.local/tmp WRANGLER_SEND_METRICS=false`
  (`.local/` is gitignored). For headless Chrome screenshots, use `--user-data-dir=$PWD/.local/chrome`.
