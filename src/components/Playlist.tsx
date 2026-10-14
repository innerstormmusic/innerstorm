import { CloudDownload, Pause, Play } from 'lucide-react'
import type { Track } from '../../shared/track'
import { usePlayer } from '../player/context'
import { formatTime } from '../utils/format'
import TrackCover from './TrackCover'

// Rows in the old site's playlist style: cover (with play/pause on hover), index, title, genre,
// length and a download button. Clicking a row plays it, with this list as the queue.
function Playlist({ tracks }: { tracks: Track[] }) {
  const player = usePlayer()

  return (
    <ol className="playlist">
      {tracks.map((track, index) => {
        const isCurrent = player.current?.id === track.id
        const isPlaying = isCurrent && player.isPlaying
        return (
          <li key={track.id} className={`track${isCurrent ? ' is-current' : ''}${isPlaying ? ' is-playing' : ''}`}>
            <button
              type="button"
              className="track-play"
              onClick={() => player.toggle(track, tracks)}
              aria-label={`${isPlaying ? 'Pause' : 'Play'} ${track.title}`}
              aria-pressed={isPlaying}
            >
              <span className="track-cover">
                <TrackCover track={track} />
                <span className="track-cover-icon" aria-hidden="true">
                  {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                </span>
              </span>
              <span className="track-index">{index + 1}</span>
              <span className="track-title">{track.title}</span>
              {track.genre && <span className="track-genre">{track.genre}</span>}
              {track.duration !== null && <span className="track-length">{formatTime(track.duration)}</span>}
            </button>
            <a className="track-download" href={track.downloadUrl} download aria-label={`Download ${track.title}`}>
              <CloudDownload size={18} />
            </a>
          </li>
        )
      })}
    </ol>
  )
}

export default Playlist
