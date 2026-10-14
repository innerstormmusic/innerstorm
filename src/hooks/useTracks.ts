import { useEffect, useState } from 'react'
import type { Track, TracksResponse } from '../../shared/track'

export type TracksState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; tracks: Track[] }

// Loads the whole list once; each section filters its own part out of it.
export function useTracks(): TracksState {
  const [state, setState] = useState<TracksState>({ status: 'loading' })

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

  return state
}
