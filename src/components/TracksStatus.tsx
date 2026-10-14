import type { TracksState } from '../hooks/useTracks'

// Loading / error / empty message shown in place of a list.
function TracksStatus({ state, empty }: { state: TracksState; empty: boolean }) {
  if (state.status === 'loading') return <p className="tracks-message">loading…</p>
  if (state.status === 'error') {
    return <p className="tracks-message">The list couldn&apos;t be loaded. Please try again later.</p>
  }
  if (empty) return <p className="tracks-message">Nothing here yet.</p>
  return null
}

export default TracksStatus
