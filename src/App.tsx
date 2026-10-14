import type { ReactNode } from 'react'
import type { Section as SectionName } from '../shared/track'
import calendarBg from './assets/backgrounds/innerstorm.jpeg'
import aboutBg from './assets/backgrounds/magic1.jpg'
import homeBg from './assets/backgrounds/poly.jpg'
import mixesBg from './assets/backgrounds/tom3_1.jpg'
import tracksBg from './assets/backgrounds/tomtom.jpg'
import scrollHint from './assets/scroll.gif'
import CalendarGrid from './components/CalendarGrid'
import LogoType from './components/LogoType'
import Player from './components/Player'
import Playlist from './components/Playlist'
import Section from './components/Section'
import SectionNav from './components/SectionNav'
import SocialLinks from './components/SocialLinks'
import TracksStatus from './components/TracksStatus'
import { useTracks, type TracksState } from './hooks/useTracks'
import PlayerProvider from './player/PlayerProvider'

function sectionTracks(state: TracksState, section: SectionName) {
  return state.status === 'ready' ? state.tracks.filter((track) => track.section === section) : []
}

// Text on the left, the list in a glass panel on the right (stacked on narrow screens).
function ListSection({ name, background, title, intro, glass = true, children }: {
  name: SectionName
  background: string
  title: string
  intro: ReactNode
  // The calendar's cards are glass themselves, so its panel isn't.
  glass?: boolean
  children: ReactNode
}) {
  return (
    <Section name={name} background={background}>
      <div className="section-layout">
        <div className="sidebar">
          <h2 className="section-title">{title}</h2>
          <div className="sidebar-text">{intro}</div>
        </div>
        <div className={`section-panel${glass ? ' glass' : ' section-panel-bare'}`}>{children}</div>
      </div>
    </Section>
  )
}

function App() {
  const state = useTracks()
  const tracks = sectionTracks(state, 'tracks')
  const mixes = sectionTracks(state, 'mixes')
  const calendar = sectionTracks(state, 'calendar')

  return (
    <PlayerProvider>
      <main className="page">
        <Section name="home" background={homeBg}>
          <h1 className="hero">
            <LogoType />
          </h1>
          <SocialLinks />
          <a className="scroll-down" href="#tracks" aria-label="Scroll down to the tracks">
            <img src={scrollHint} alt="" width={60} height={60} />
          </a>
        </Section>

        <ListSection
          name="tracks"
          background={tracksBg}
          title="innerstorm's tracks"
          intro={
            <>
              <p>
                Oh man, it&apos;s easier to program this whole website than writing down some thoughts about the
                music. How do they say? Writing about music is like dancing about architecture.
              </p>
              <p>
                Ok, I&apos;m not a musician, I just wanted to write down some thoughts, feelings, colours, glimpses.
                Moments that deserved to be captured.
              </p>
              <p>
                Here are some of these tracks, in chronologic order, latest first. The player goes round the clock,
                check it out.
              </p>
            </>
          }
        >
          <TracksStatus state={state} empty={tracks.length === 0} />
          {tracks.length > 0 && <Playlist tracks={tracks} />}
        </ListSection>

        <ListSection
          name="mixes"
          background={mixesBg}
          title="mixes"
          intro={
            <>
              <p>
                Here are some of the mixes I&apos;ve created. I really like seamless mixing, going around the Camelot
                wheel, painting on a canvas of sounds. I prefer playing around mostly with breaks and liquid dnb.
              </p>
              <p>
                <strong title="Endorphins are neurotransmitters released by the pituitary gland and hypothalamus in the brain. As natural hormones, they can alleviate pain, lower stress, improve mood, and enhance your sense of well-being. The body releases endorphins when you do pleasurable activities such as eating, exercise, and sex, etc.">
                  Endorfine
                </strong>{' '}
                (as in end-or-fine) is a series of house/breaks mixes with some tracks that I really like.{' '}
                <strong title="Dopamine is a type of neurotransmitter and hormone. It plays a role in many important body functions, including movement, memory and pleasurable reward and motivation.">
                  Dopamine
                </strong>
                , the sister hormone of endorfine, is a pair of liquid d&apos;n&apos;b mixes. They are numbered, with
                (hopefully) more to come.
              </p>
              <p>
                I tend to create around themes. <strong>Midnight Express</strong> for example is meant to be listened
                on a night train while almost asleep... at least it&apos;s like it in my head. Breaking the clouds is
                crafted around the fantastic track &quot;A break in the clouds&quot; by James Holden, and{' '}
                <strong title="“Waldeinsamkeit” is a German word without a direct English translation. It can best be translated to “the feeling of being alone in the woods.”">
                  Waldeinsamkeit
                </strong>
                , while its title tries to break your tongues, its sound explores the spiritual feeling one has while
                being alone in a forest.
              </p>
            </>
          }
        >
          <TracksStatus state={state} empty={mixes.length === 0} />
          {mixes.length > 0 && <Playlist tracks={mixes} />}
        </ListSection>

        <ListSection
          name="calendar"
          background={calendarBg}
          title="calendar mixes"
          glass={false}
          intro={
            <>
              <p>
                The twelve months project began in 2021. The first one was September with some nice breaks tunes,
                then the all time favourite, liquid drum and bass, and so on.
              </p>
              <p>
                Each month I&apos;ve tried to bring a different theme, however while staying in my prefered styles.
                One can say it&apos;s a diorama of the music I like.
              </p>
              <p>
                These mixes are up on{' '}
                <a
                  className="text-link"
                  href="https://www.youtube.com/watch?v=OHdwKc5hHCY&list=PL2Vmf-tMeSp7L-Ote7g9wkgcaeGOVdLyP"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Youtube
                </a>
                , so you can enjoy them there too.
              </p>
            </>
          }
        >
          <TracksStatus state={state} empty={calendar.length === 0} />
          {calendar.length > 0 && <CalendarGrid tracks={calendar} />}
        </ListSection>

        <Section name="about" background={aboutBg}>
          <div className="glass about">
            <h2 className="section-title">innerstorm</h2>
            <p className="terminal">
              &gt; Help me write an introduction for an enthusiastic music producer and DJ&apos;s website. The text
              should focus on the exploration of new sounds, expressing emotions through music, and breaking free from
              the limitations of specific genres, allowing the music to evolve naturally. Please avoid making it sound
              like an action movie trailer.
              <br />
              <br />
              &gt; &hellip;
              <br />
              &gt; Nothing is more permanent than a temporary solution.
            </p>
          </div>
          <SocialLinks />
        </Section>
      </main>
      <SectionNav />
      <Player />
    </PlayerProvider>
  )
}

export default App
