import { parseBuffer, type IAudioMetadata, type IPicture } from 'music-metadata'

// What the track list needs from a file's tags. Cached per file version (R2 etag).
export interface FileTags {
  title: string | null
  artist: string | null
  album: string | null
  genre: string | null
  year: number | null
  trackNo: number | null
  duration: number | null
  hasCover: boolean
}

const ID3_HEADER_SIZE = 10
// Read past the end of the tag so the parser sees the first MPEG frames (bitrate, VBR header).
const AUDIO_PROBE_BYTES = 16 * 1024
// A cover larger than this is an unusual file; don't buffer it whole into the Worker.
const MAX_HEAD_BYTES = 8 * 1024 * 1024

// Reads the start of the file: the ID3v2 tag (cover art included) plus a few audio frames.
// The rest of the MP3 is never downloaded.
async function readHead(bucket: R2Bucket, object: R2Object): Promise<{ bytes: Uint8Array; audioStart: number }> {
  const header = await bucket.get(object.key, { range: { offset: 0, length: ID3_HEADER_SIZE } })
  if (!header) throw new Error(`${object.key} disappeared`)
  const start = new Uint8Array(await header.arrayBuffer())

  let audioStart = 0
  // "ID3", then version, flags and the tag size as a 28-bit synchsafe integer
  if (start[0] === 0x49 && start[1] === 0x44 && start[2] === 0x33) {
    const tagSize = ((start[6] & 0x7f) << 21) | ((start[7] & 0x7f) << 14) | ((start[8] & 0x7f) << 7) | (start[9] & 0x7f)
    const hasFooter = (start[5] & 0x10) !== 0
    audioStart = ID3_HEADER_SIZE + tagSize + (hasFooter ? ID3_HEADER_SIZE : 0)
  }

  const length = Math.min(object.size, audioStart + AUDIO_PROBE_BYTES, MAX_HEAD_BYTES)
  const head = await bucket.get(object.key, { range: { offset: 0, length } })
  if (!head) throw new Error(`${object.key} disappeared`)
  return { bytes: new Uint8Array(await head.arrayBuffer()), audioStart }
}

async function parseHead(bytes: Uint8Array, size: number): Promise<IAudioMetadata> {
  // duration: false stops the parser from scanning for more frames than it was given.
  return parseBuffer(bytes, { mimeType: 'audio/mpeg', size }, { duration: false })
}

// The parser only sees the first frames, so its own duration is wrong for constant-bitrate files.
// For those, the length follows from the audio size and the bitrate. VBR files carry a Xing/VBRI
// header with the frame count, from which the parser's duration is correct.
function durationOf(metadata: IAudioMetadata, size: number, audioStart: number): number | null {
  const { codecProfile, bitrate, duration } = metadata.format
  if (codecProfile === 'CBR' && bitrate) return ((size - audioStart) * 8) / bitrate
  return duration ?? null
}

export async function readTags(bucket: R2Bucket, object: R2Object): Promise<FileTags> {
  const { bytes, audioStart } = await readHead(bucket, object)
  const metadata = await parseHead(bytes, object.size)
  const { common } = metadata

  return {
    title: common.title?.trim() || null,
    artist: common.artist?.trim() || null,
    album: common.album?.trim() || null,
    genre: common.genre?.[0]?.trim() || null,
    year: common.year ?? null,
    trackNo: common.track.no ?? null,
    duration: durationOf(metadata, object.size, audioStart),
    hasCover: (common.picture?.length ?? 0) > 0,
  }
}

// The embedded front cover, or the first picture when none is marked as the front.
export async function readCover(bucket: R2Bucket, object: R2Object): Promise<IPicture | null> {
  const { bytes } = await readHead(bucket, object)
  const pictures = (await parseHead(bytes, object.size)).common.picture ?? []
  return pictures.find((picture) => picture.type === 'Cover (front)') ?? pictures[0] ?? null
}
