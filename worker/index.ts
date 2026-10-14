import { SECTIONS, type Section, type Track, type TracksResponse } from '../shared/track'
import { serveMedia } from './media'
import { readCover, readTags, type FileTags } from './tags'

// Cloudflare's edge keeps the track list this long before listing the bucket again.
const LIST_EDGE_CACHE_SECONDS = 300
const LIST_BROWSER_CACHE_SECONDS = 60
// Tags and covers are cached per file version (etag), so they can be kept for long.
const TAGS_CACHE_SECONDS = 30 * 24 * 3600
const COVER_CACHE = 'public, max-age=31536000, immutable'

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }

    if (url.pathname === '/api/tracks') return handleTracks(request, env, ctx)

    if (url.pathname.startsWith('/api/cover/')) {
      const key = keyFromPath(url.pathname, '/api/cover/')
      return key ? handleCover(request, env, ctx, key) : notFound()
    }

    if (url.pathname.startsWith('/media/')) {
      const key = keyFromPath(url.pathname, '/media/')
      return key ? serveMedia(request, env.MEDIA, key, url.searchParams.has('download')) : notFound()
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
} satisfies ExportedHandler<Env>

// Only MP3s inside the section folders are served; anything else in the bucket stays private.
function keyFromPath(pathname: string, prefix: string): string | null {
  let key: string
  try {
    key = decodeURIComponent(pathname.slice(prefix.length))
  } catch {
    return null
  }
  return sectionOf(key) && /\.mp3$/i.test(key) && !key.includes('..') ? key : null
}

function sectionOf(key: string): Section | null {
  const folder = key.slice(0, key.indexOf('/'))
  return (SECTIONS as readonly string[]).includes(folder) ? (folder as Section) : null
}

function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/')
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
}

// TRACK LIST

async function handleTracks(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' })

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const objects = (await listBucket(env.MEDIA)).filter((object) => sectionOf(object.key) && /\.mp3$/i.test(object.key))
    const origin = new URL(request.url).origin
    const tracks = await Promise.all(
      objects.map(async (object) => toTrack(object, await cachedTags(env.MEDIA, object, origin, ctx))),
    )
    const body: TracksResponse = { tracks: tracks.sort(compareTracks) }
    const response = Response.json(body, {
      headers: {
        'Cache-Control': `public, max-age=${LIST_BROWSER_CACHE_SECONDS}, s-maxage=${LIST_EDGE_CACHE_SECONDS}`,
      },
    })
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    console.error('Building the track list failed:', error)
    return Response.json(
      { error: 'Could not load the track list' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

async function listBucket(bucket: R2Bucket): Promise<R2Object[]> {
  const objects: R2Object[] = []
  let cursor: string | undefined
  do {
    const page = await bucket.list({ cursor, limit: 1000 })
    objects.push(...page.objects)
    cursor = page.truncated ? page.cursor : undefined
  } while (cursor)
  return objects
}

// Parsing a file's tags means reading its first ~100 KB from R2, so the result is cached per etag:
// a file is only read again after it's replaced.
async function cachedTags(bucket: R2Bucket, object: R2Object, origin: string, ctx: ExecutionContext): Promise<FileTags> {
  const cacheKey = new Request(`${origin}/api/_tags/${encodeKey(object.key)}?v=${encodeURIComponent(object.etag)}`)
  const cached = await caches.default.match(cacheKey)
  if (cached) return cached.json()

  const tags = await readTags(bucket, object)
  const response = Response.json(tags, { headers: { 'Cache-Control': `public, max-age=${TAGS_CACHE_SECONDS}` } })
  ctx.waitUntil(caches.default.put(cacheKey, response))
  return tags
}

function toTrack(object: R2Object, tags: FileTags): Track {
  // Files without tags fall back to their name, "artist - title.mp3".
  const fileName = object.key.slice(object.key.lastIndexOf('/') + 1).replace(/\.mp3$/i, '')
  const separator = fileName.indexOf(' - ')
  const nameArtist = separator === -1 ? '' : fileName.slice(0, separator).trim()
  const nameTitle = separator === -1 ? fileName : fileName.slice(separator + 3).trim()

  const path = encodeKey(object.key)
  return {
    id: object.key,
    section: sectionOf(object.key)!,
    title: tags.title ?? nameTitle,
    // The artist's own name is always lowercase, matching the logo, even when a tag says "Innerstorm".
    artist: (tags.artist ?? nameArtist).replace(/\binnerstorm\b/gi, 'innerstorm'),
    album: tags.album,
    genre: tags.genre,
    year: tags.year,
    trackNo: tags.trackNo,
    duration: tags.duration,
    size: object.size,
    audioUrl: `/media/${path}`,
    downloadUrl: `/media/${path}?download`,
    coverUrl: tags.hasCover ? `/api/cover/${path}?v=${encodeURIComponent(object.etag)}` : null,
  }
}

// By track number; files without one come after, newest year first, then by title.
function compareTracks(a: Track, b: Track): number {
  return (
    compareNullable(a.trackNo, b.trackNo, (x, y) => x - y) ||
    compareNullable(a.year, b.year, (x, y) => y - x) ||
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
  )
}

function compareNullable<T>(a: T | null, b: T | null, compare: (a: T, b: T) => number): number {
  if (a === null) return b === null ? 0 : 1
  if (b === null) return -1
  return compare(a, b)
}

// COVERS

async function handleCover(request: Request, env: Env, ctx: ExecutionContext, key: string): Promise<Response> {
  const cache = caches.default
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const object = await env.MEDIA.head(key)
  if (!object) return notFound()

  const cover = await readCover(env.MEDIA, object)
  if (!cover) return notFound()

  const response = new Response(cover.data, {
    headers: { 'Content-Type': cover.format, 'Cache-Control': COVER_CACHE, ETag: object.httpEtag },
  })
  ctx.waitUntil(cache.put(cacheKey, response.clone()))
  return response
}
