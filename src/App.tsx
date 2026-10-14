import LogoType from './components/LogoType'
import SocialLinks from './components/SocialLinks'
import TrackList from './components/TrackList'

function App() {
  return (
    <main className="page">
      <h1 className="hero">
        <LogoType />
      </h1>

      <section className="glass tracks" aria-labelledby="tracks-heading">
        <h2 id="tracks-heading">tracks</h2>
        <TrackList />
      </section>

      <footer className="footer">
        <SocialLinks />
      </footer>
    </main>
  )
}

export default App
