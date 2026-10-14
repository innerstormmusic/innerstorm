import { Pause, Play } from 'lucide-react'
import type { Track } from '../../shared/track'
import { usePlayer } from '../player/context'
import TrackCover from './TrackCover'

// The calendar mixes as a grid of cover cards; hovering (or playing) blurs the cover and shows
// the title and genre over it, like on the old site.
function CalendarGrid({ tracks }: { tracks: Track[] }) {
  const player = usePlayer()

  return (
    <ol className="calendar-grid">
      {tracks.map((track) => {
        const isCurrent = player.current?.id === track.id
        const isPlaying = isCurrent && player.isPlaying
        return (
          <li key={track.id}>
            <button
              type="button"
              className={`calendar-card glass${isCurrent ? ' is-current' : ''}`}
              onClick={() => player.toggle(track, tracks)}
              aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
              aria-pressed={isPlaying}
            >
              <TrackCover track={track} />
              <span className="calendar-card-text" aria-hidden="true">
                <span className="calendar-card-title">{track.title}</span>
                {track.genre && <span className="calendar-card-genre">{track.genre}</span>}
              </span>
              <span className="calendar-card-icon" aria-hidden="true">
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export default CalendarGrid
