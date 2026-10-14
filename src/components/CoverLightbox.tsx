import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { Track } from '../../shared/track'

interface Props {
  track: Track | null
  open: boolean
  onClose: () => void
}

// The playing track's cover, as large as fits the screen, over a dark blurred backdrop (as on the old
// site). A click anywhere except the image closes it, and so do Esc and the close button. Built on
// <dialog> for the focus handling and Esc.
function CoverLightbox({ track, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const show = open && Boolean(track?.coverUrl)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (show && !dialog.open) dialog.showModal()
    else if (!show && dialog.open) dialog.close()
  }, [show])

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={track ? `Cover of ${track.title}` : 'Cover'}
      onClose={onClose}
      onClick={(event) => {
        if (!(event.target instanceof HTMLImageElement)) onClose()
      }}
    >
      {show && track?.coverUrl && <img className="lightbox-image" src={track.coverUrl} alt={`Cover of ${track.title}`} />}
      <button type="button" className="lightbox-close" aria-label="Close">
        <X size={24} />
      </button>
    </dialog>
  )
}

export default CoverLightbox
