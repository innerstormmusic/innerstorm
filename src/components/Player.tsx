import { ChevronFirst, ChevronLast, CircleAlert, CloudDownload, LoaderCircle, Pause, Play, Volume1, Volume2, VolumeX } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { usePlayer } from '../player/context'
import { formatTime } from '../utils/format'
import CoverLightbox from './CoverLightbox'
import TrackCover from './TrackCover'

// The bar fixed to the bottom of the screen. It slides in once a track has been started.
// No waveform: a plain progress bar that can be dragged to seek.
function Player() {
  const player = usePlayer()
  const { current, duration, time } = player
  const [coverOpen, setCoverOpen] = useState(false)
  const progress = duration > 0 ? Math.min(1, time / duration) : 0
  const VolumeIcon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2

  return (
    <div className={`player glass${current ? ' is-open' : ''}`} aria-label="Player" role="region" inert={!current}>
      <button
        type="button"
        className="player-cover"
        onClick={() => setCoverOpen(true)}
        disabled={!current?.coverUrl}
        aria-label="Show the cover"
      >
        {current && <TrackCover track={current} />}
      </button>

      <div className="player-info">
        <span className="player-title">{current?.title}</span>
        <span className="player-meta">
          {player.hasError ? (
            <span className="player-error">
              <CircleAlert size={14} /> The track couldn&apos;t be loaded.
            </span>
          ) : (
            [current?.genre, current?.year].filter(Boolean).join(' / ')
          )}
        </span>
      </div>

      <div className="player-controls">
        <button type="button" className="player-button" onClick={player.previous} aria-label="Previous track">
          <ChevronFirst size={26} />
        </button>
        <button
          type="button"
          className="player-button player-toggle"
          onClick={() => player.toggle()}
          aria-label={player.isPlaying ? 'Pause' : 'Play'}
        >
          {player.isLoading && player.isPlaying ? (
            <LoaderCircle size={22} className="spin" />
          ) : player.isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} className="nudge" />
          )}
        </button>
        <button type="button" className="player-button" onClick={player.next} aria-label="Next track">
          <ChevronLast size={26} />
        </button>
      </div>

      <div className="player-progress">
        <span className="player-time">{formatTime(time)}</span>
        <input
          type="range"
          className="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={time}
          onChange={(event) => player.seek(Number(event.target.value))}
          aria-label="Seek"
          aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
          style={{ '--fill': `${progress * 100}%` } as CSSProperties}
        />
        <span className="player-time">{formatTime(duration)}</span>
      </div>

      <div className="player-extra">
        <label className="player-volume">
          <VolumeIcon size={20} aria-hidden="true" />
          <input
            type="range"
            className="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            onChange={(event) => player.setVolume(Number(event.target.value))}
            aria-label="Volume"
            style={{ '--fill': `${player.volume * 100}%` } as CSSProperties}
          />
        </label>
        {current && (
          <a className="player-button" href={current.downloadUrl} download aria-label={`Download ${current.title}`}>
            <CloudDownload size={20} />
          </a>
        )}
      </div>
      <CoverLightbox track={current} open={coverOpen} onClose={() => setCoverOpen(false)} />
    </div>
  )
}

export default Player
