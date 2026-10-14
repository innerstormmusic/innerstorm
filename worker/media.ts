// Serves an MP3 straight from R2. Range requests are passed through, so the browser can start
// playing right away and seek anywhere without downloading the whole file.

const MEDIA_CACHE = 'public, max-age=86400'

export async function serveMedia(request: Request, bucket: R2Bucket, key: string, download: boolean): Promise<Response> {
  if (request.method === 'HEAD') {
    const object = await bucket.head(key)
    if (!object) return notFound()
    return new Response(null, { headers: mediaHeaders(object, key, download, object.size) })
  }

  let object: R2Object | R2ObjectBody | null
  try {
    object = await bucket.get(key, { range: request.headers, onlyIf: request.headers })
  } catch {
    // R2 rejects ranges it can't satisfy, e.g. one that starts past the end of the file.
    const head = await bucket.head(key)
    if (!head) return notFound()
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${head.size}` } })
  }
  if (!object) return notFound()

  // A conditional request (If-None-Match etc.) matched, so R2 returned no body.
  if (!('body' in object)) {
    return new Response(null, { status: 304, headers: mediaHeaders(object, key, download) })
  }

  const rangeHeader = request.headers.get('Range')
  // Some R2 backends answer a range that starts past the end with the whole file instead of failing.
  const rangeStart = rangeHeader?.match(/^bytes=(\d+)-/)?.[1]
  if (rangeStart !== undefined && Number(rangeStart) >= object.size) {
    await object.body.cancel()
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${object.size}` } })
  }

  const range = resolveRange(object.range, object.size)
  if (!range || !rangeHeader) {
    return new Response(object.body, { headers: mediaHeaders(object, key, download, object.size) })
  }

  const headers = mediaHeaders(object, key, download, range.length)
  headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`)
  return new Response(object.body, { status: 206, headers })
}

function resolveRange(range: R2Range | undefined, size: number): { offset: number; length: number } | null {
  if (!range) return null
  if ('suffix' in range && range.suffix !== undefined) {
    const length = Math.min(range.suffix, size)
    return { offset: size - length, length }
  }
  const offset = 'offset' in range && range.offset !== undefined ? range.offset : 0
  const length = 'length' in range && range.length !== undefined ? range.length : size - offset
  return { offset, length }
}

function mediaHeaders(object: R2Object, key: string, download: boolean, contentLength?: number): Headers {
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Content-Type', 'audio/mpeg')
  headers.set('ETag', object.httpEtag)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', MEDIA_CACHE)
  if (contentLength !== undefined) headers.set('Content-Length', String(contentLength))
  if (download) {
    const fileName = key.slice(key.lastIndexOf('/') + 1)
    headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`)
  }
  return headers
}

function notFound(): Response {
  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } })
}
