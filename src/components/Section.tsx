import type { CSSProperties, ReactNode } from 'react'

interface Props {
  name: string
  background: string
  label?: string
  children: ReactNode
}

// One full-height screen of the page, over its own darkened, blurred background (as on the old site).
function Section({ name, background, label, children }: Props) {
  return (
    <section
      id={name}
      className={`section section-${name}`}
      aria-label={label}
      style={{ '--section-bg': `url("${background}")` } as CSSProperties}
    >
      {children}
    </section>
  )
}

export default Section
