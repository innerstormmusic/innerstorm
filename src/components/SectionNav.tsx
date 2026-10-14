import { useEffect, useState } from 'react'
import { useWheelPaging } from '../hooks/useWheelPaging'

const NAV_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'mixes', label: 'Mixes' },
  { id: 'calendar', label: 'Calendar mixes' },
  { id: 'about', label: 'About' },
]

// Dots on the right edge that jump to each section (plain anchor links; the CSS does the smooth
// scroll and snapping). The observer only marks the section that's in view.
function SectionNav() {
  const [active, setActive] = useState(NAV_SECTIONS[0].id)
  useWheelPaging('.section')

  // The browser looks for the #section of the URL before React has rendered it, so jump there once
  // the sections exist.
  useEffect(() => {
    const target = location.hash && document.getElementById(location.hash.slice(1))
    if (target) target.scrollIntoView({ behavior: 'instant' })
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      // A section counts as current once it covers the middle of the screen.
      { rootMargin: '-50% 0px -50% 0px' },
    )
    for (const { id } of NAV_SECTIONS) {
      const section = document.getElementById(id)
      if (section) observer.observe(section)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <nav className="section-nav" aria-label="Sections">
      <ul>
        {NAV_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <a href={`#${id}`} className="section-nav-link" aria-current={active === id ? 'location' : undefined}>
              <span className="section-nav-label">{label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default SectionNav
