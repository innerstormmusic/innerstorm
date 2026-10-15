// The R2 bucket's top-level folders. Each one is a section of the site.
export const SECTIONS = ['tracks', 'mixes', 'calendar'] as const
export type Section = (typeof SECTIONS)[number]

// One MP3 from the bucket, as returned by the Worker's /api/tracks endpoint. Everything except
// the key, size and URLs comes from the file's own ID3 tags.
export interface Track {
  // The R2 object key, e.g. "tracks/innerstorm - Caveman.mp3"
  id: string
  section: Section
  title: string
  artist: string
  album: string | null
  genre: string | null
  year: number | null
  trackNo: number | null
  // Seconds; null when it couldn't be worked out.
  duration: number | null
  // File size in bytes
  size: number
  // Streams the file (supports HTTP Range, so seeking works)
  audioUrl: string
  // Same file, served as an attachment
  downloadUrl: string
  // Embedded cover art, or null when the file has none
  coverUrl: string | null
}

// A file in the bucket that the lists leave out, and why
export interface SkippedFile {
  key: string
  reason: string
}

export interface TracksResponse {
  tracks: Track[]
  skipped: SkippedFile[]
}
