import type { CSSProperties } from 'react'
import facebook from '../assets/icons/icon-facebook.svg'
import instagram from '../assets/icons/icon-instagram.svg'
import soundcloud from '../assets/icons/icon-soundcloud.svg'
import youtube from '../assets/icons/icon-youtube.svg'

const links = [
  { name: 'Soundcloud', href: 'https://soundcloud.com/innerstorm', icon: soundcloud },
  { name: 'Youtube', href: 'https://www.youtube.com/1nn3rst0rm', icon: youtube },
  { name: 'Facebook', href: 'https://www.facebook.com/1nn3rst0rm', icon: facebook },
  { name: 'Instagram', href: 'https://www.instagram.com/innerstormmusic/', icon: instagram },
]

function SocialLinks() {
  return (
    <ul className="social-links">
      {links.map(({ name, href, icon }) => (
        <li key={name}>
          <a className="social-link" href={href} target="_blank" rel="noopener noreferrer" aria-label={name}>
            {/* The SVG is used as a mask so its colour and glow come from CSS. */}
            <span className="social-icon" style={{ '--icon': `url("${icon}")` } as CSSProperties} />
            <span className="tooltip" aria-hidden="true">
              {name}
            </span>
          </a>
        </li>
      ))}
    </ul>
  )
}

export default SocialLinks
