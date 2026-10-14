import { createContext, useContext } from 'react'
import type { Track } from '../../shared/track'

export interface Player {
  current: Track | null
  isPlaying: boolean
  // The track is buffering, or still loading before it can start
  isLoading: boolean
  hasError: boolean
  // Seconds
  time: number
  duration: number
  volume: number
  // Plays the track; `queue` is the list that next/previous and auto-advance walk through.
  play: (track: Track, queue: Track[]) => void
  // Pauses when the track is playing, plays it otherwise.
  toggle: (track?: Track, queue?: Track[]) => void
  next: () => void
  previous: () => void
  seek: (seconds: number) => void
  setVolume: (volume: number) => void
}

export const PlayerContext = createContext<Player | null>(null)

export function usePlayer(): Player {
  const player = useContext(PlayerContext)
  if (!player) throw new Error('usePlayer must be used inside <PlayerProvider>')
  return player
}
