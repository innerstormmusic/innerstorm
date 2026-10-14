import { Music } from 'lucide-react'
import type { Track } from '../../shared/track'

// The cover embedded in the MP3, or a plain tile when the file has none.
function TrackCover({ track, className = '' }: { track: Track; className?: string }) {
  if (!track.coverUrl) {
    return (
      <span className={`cover cover-placeholder ${className}`}>
        <Music size={18} />
      </span>
    )
  }
  return <img className={`cover ${className}`} src={track.coverUrl} alt="" loading="lazy" decoding="async" />
}

export default TrackCover
