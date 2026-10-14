import { CloudDownload } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Track, TracksResponse } from '../../shared/track'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; tracks: Track[] }

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function TrackList() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/tracks', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<TracksResponse>
      })
      .then(({ tracks }) => setState({ status: 'ready', tracks }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error('Loading tracks failed:', error)
        setState({ status: 'error' })
      })

    return () => controller.abort()
  }, [])

  if (state.status === 'loading') {
    return <p className="tracks-message">loading tracks…</p>
  }

  if (state.status === 'error') {
    return <p className="tracks-message">The track list couldn&apos;t be loaded. Please try again later.</p>
  }

  if (state.tracks.length === 0) {
    return <p className="tracks-message">No tracks yet.</p>
  }

  return (
    <ol className="track-list">
      {state.tracks.map((track, index) => (
        <li key={track.id}>
          <a
            className="track"
            href={track.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Download ${track.title}${track.artist ? ` by ${track.artist}` : ''}`}
          >
            <span className="track-index">{index + 1}</span>
            <span className="track-name">
              <span className="track-title">{track.title}</span>
              {track.artist && <span className="track-artist">{track.artist}</span>}
            </span>
            {track.size !== null && <span className="track-size">{formatSize(track.size)}</span>}
            <span className="track-download" aria-hidden="true">
              <CloudDownload size={18} />
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}

export default TrackList
