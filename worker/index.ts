import type { Track, TracksResponse } from '../shared/track'

// Cloudflare's edge keeps the Drive listing this long before asking Drive again.
const EDGE_CACHE_SECONDS = 600
const BROWSER_CACHE_SECONDS = 60

const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files'

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime: string
}

interface DriveFileList {
  files?: DriveFile[]
  nextPageToken?: string
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)

    if (url.pathname === '/api/tracks' && request.method === 'GET') {
      return handleTracks(request, env, ctx)
    }

    return Response.json({ error: 'Not found' }, { status: 404 })
  },
} satisfies ExportedHandler<Env>

async function handleTracks(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cache = caches.default
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' })

  const cached = await cache.match(cacheKey)
  if (cached) return cached

  try {
    const files = await listDriveFolder(env)
    const body: TracksResponse = { tracks: files.map(toTrack) }
    const response = Response.json(body, {
      headers: {
        'Cache-Control': `public, max-age=${BROWSER_CACHE_SECONDS}, s-maxage=${EDGE_CACHE_SECONDS}`,
      },
    })
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    console.error('Listing the Drive folder failed:', error)
    return Response.json(
      { error: 'Could not load the track list' },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'
const MP3_MIME_TYPE = 'audio/mpeg'
// Guards against runaway listings: each folder costs at least one Drive request, and a Worker
// invocation may only make a limited number of subrequests.
const MAX_FOLDERS = 40

// Lists every MP3 under the shared Drive folder, including all subfolders, newest first.
async function listDriveFolder(env: Env): Promise<DriveFile[]> {
  if (!env.GOOGLE_API_KEY || !env.DRIVE_FOLDER_ID) {
    throw new Error('GOOGLE_API_KEY or DRIVE_FOLDER_ID is not configured')
  }

  const mp3s: DriveFile[] = []
  let pending = [env.DRIVE_FOLDER_ID]
  let visited = 0

  while (pending.length > 0) {
    if (visited + pending.length > MAX_FOLDERS) {
      throw new Error(`More than ${MAX_FOLDERS} folders under the Drive folder`)
    }
    visited += pending.length

    const levels = await Promise.all(pending.map((folderId) => listFolderChildren(folderId, env.GOOGLE_API_KEY)))
    pending = []
    for (const file of levels.flat()) {
      if (file.mimeType === FOLDER_MIME_TYPE) pending.push(file.id)
      else mp3s.push(file)
    }
  }

  return mp3s.sort((a, b) => b.createdTime.localeCompare(a.createdTime))
}

// One folder level: its MP3s and subfolders, following pagination.
async function listFolderChildren(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and (mimeType = '${MP3_MIME_TYPE}' or mimeType = '${FOLDER_MIME_TYPE}')`,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
      pageSize: '1000',
      key: apiKey,
    })
    if (pageToken) params.set('pageToken', pageToken)

    const response = await fetch(`${DRIVE_FILES_URL}?${params}`)
    if (!response.ok) {
      throw new Error(`Drive API responded ${response.status}: ${await response.text()}`)
    }

    const page: DriveFileList = await response.json()
    files.push(...(page.files ?? []))
    pageToken = page.nextPageToken
  } while (pageToken)

  return files
}

// File names follow "artist - track name.mp3". The artist's own name is always shown in lowercase,
// matching the logo, even when a file says "Innerstorm".
function toTrack(file: DriveFile): Track {
  const baseName = file.name.replace(/\.mp3$/i, '').trim()
  const separator = baseName.indexOf(' - ')
  const artist = separator === -1 ? '' : baseName.slice(0, separator).trim().replace(/\binnerstorm\b/gi, 'innerstorm')
  const title = separator === -1 ? baseName : baseName.slice(separator + 3).trim()

  return {
    id: file.id,
    artist,
    title,
    size: file.size ? Number(file.size) : null,
    added: file.createdTime,
    downloadUrl: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(file.id)}`,
  }
}
