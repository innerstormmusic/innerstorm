// A downloadable track, as returned by the Worker's /api/tracks endpoint.
export interface Track {
  id: string
  artist: string
  title: string
  // File size in bytes; null when Drive doesn't report one.
  size: number | null
  // ISO timestamp of when the file was added to Drive.
  added: string
  downloadUrl: string
}

export interface TracksResponse {
  tracks: Track[]
}
