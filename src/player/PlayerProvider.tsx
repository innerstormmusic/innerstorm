import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Track } from '../../shared/track'
import { PlayerContext, type Player } from './context'

const VOLUME_KEY = 'innerstorm:volume'
// "Previous" restarts the current track when it's past this point, like most players.
const RESTART_THRESHOLD_SECONDS = 3

function savedVolume(): number {
  try {
    const value = Number(localStorage.getItem(VOLUME_KEY))
    return value > 0 && value <= 1 ? value : 0.8
  } catch {
    return 0.8
  }
}

// Owns the one <audio> element of the page. It streams the MP3 from the Worker, which passes
// Range requests through to R2, so playback starts right away and seeking doesn't download the file.
function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const queueRef = useRef<Track[]>([])
  const currentRef = useRef<Track | null>(null)

  const [current, setCurrent] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(savedVolume)

  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    audio.play().catch((error: unknown) => {
      // Switching tracks interrupts a pending play(); that's expected.
      if (error instanceof DOMException && error.name === 'AbortError') return
      console.error('Playback failed:', error)
      setIsLoading(false)
    })
  }, [])

  const load = useCallback(
    (track: Track, autoplay: boolean) => {
      const audio = audioRef.current
      if (!audio) return
      currentRef.current = track
      setCurrent(track)
      setHasError(false)
      setTime(0)
      setDuration(track.duration ?? 0)
      audio.src = track.audioUrl
      if (autoplay) {
        setIsLoading(true)
        startPlayback(audio)
      }
    },
    [startPlayback],
  )

  // Moves through the queue, wrapping around at both ends like the old site's player.
  const step = useCallback(
    (direction: 1 | -1, autoplay: boolean) => {
      const queue = queueRef.current
      const track = currentRef.current
      if (!track || queue.length === 0) return
      const index = Math.max(0, queue.findIndex((item) => item.id === track.id))
      load(queue[(index + direction + queue.length) % queue.length], autoplay)
    },
    [load],
  )

  const actions = useMemo(() => {
    const play = (track: Track, queue: Track[]) => {
      queueRef.current = queue
      const audio = audioRef.current
      if (currentRef.current?.id === track.id && audio) startPlayback(audio)
      else load(track, true)
    }

    return {
      play,
      toggle: (track?: Track, queue?: Track[]) => {
        const audio = audioRef.current
        if (!audio) return
        if (track && track.id !== currentRef.current?.id) return play(track, queue ?? [track])
        if (audio.paused) startPlayback(audio)
        else audio.pause()
      },
      next: () => step(1, !audioRef.current?.paused),
      previous: () => {
        const audio = audioRef.current
        if (audio && audio.currentTime > RESTART_THRESHOLD_SECONDS) audio.currentTime = 0
        else step(-1, !audio?.paused)
      },
      seek: (seconds: number) => {
        const audio = audioRef.current
        if (!audio || !currentRef.current) return
        audio.currentTime = seconds
        setTime(seconds)
      },
      setVolume: (value: number) => {
        setVolumeState(value)
        try {
          localStorage.setItem(VOLUME_KEY, String(value))
        } catch {
          // Storage can be unavailable (private mode); the volume just isn't remembered.
        }
      },
    }
  }, [load, startPlayback, step])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  // Lock screen / media keys: show the track and wire the hardware buttons to the player.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    session.setActionHandler('play', () => actions.toggle())
    session.setActionHandler('pause', () => actions.toggle())
    session.setActionHandler('nexttrack', actions.next)
    session.setActionHandler('previoustrack', actions.previous)
    session.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) actions.seek(details.seekTime)
    })
  }, [actions])

  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? '',
      artwork: current.coverUrl ? [{ src: current.coverUrl }] : [],
    })
  }, [current])

  const player: Player = { current, isPlaying, isLoading, hasError, time, duration, volume, ...actions }

  return (
    <PlayerContext value={player}>
      {children}
      <audio
        ref={audioRef}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onCanPlay={() => setIsLoading(false)}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onDurationChange={(event) => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value)) setDuration(value)
        }}
        onEnded={() => step(1, true)}
        onError={() => {
          // An empty src (before the first track) also fires error; only report real failures.
          if (!currentRef.current) return
          setHasError(true)
          setIsLoading(false)
          setIsPlaying(false)
        }}
      />
    </PlayerContext>
  )
}

export default PlayerProvider
