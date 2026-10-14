import { useEffect } from 'react'

// Same condition as the strict snapping in index.css; phones scroll freely.
const PAGING_QUERY = '(min-width: 800px) and (min-height: 600px)'
// A gesture is over once no wheel events have come in for this long. Trackpads keep sending
// fading "momentum" events after the fingers lift; they count as the same gesture.
const GESTURE_GAP_MS = 200

// One wheel gesture (a mouse notch, or a trackpad swipe with its momentum) moves exactly one section.
// CSS snapping alone snaps a small wheel step back to the same section, and lets a fast fling skip
// several. The wheel over a scrollable list only ever scrolls that list. Keyboard and anchor links
// are left to the browser and the CSS.
export function useWheelPaging(selector: string) {
  useEffect(() => {
    const media = matchMedia(PAGING_QUERY)
    // The smooth scroll to the next section is running
    let scrolling = false
    let lastWheel = 0
    let lastDelta = 0
    let scrollTimer: number | undefined

    const scrollDone = () => {
      window.clearTimeout(scrollTimer)
      scrolling = false
    }

    const onWheel = (event: WheelEvent) => {
      if (!media.matches || event.ctrlKey || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      // An open dialog (the cover lightbox) holds the page still.
      if (document.querySelector('dialog[open]')) return
      const direction = Math.sign(event.deltaY)
      const now = performance.now()

      // Over a list, the wheel belongs to the list: at its top or bottom the page doesn't move either.
      const list = scrollableAncestor(event.target)
      if (list) {
        if (!canScroll(list, direction)) event.preventDefault()
        return
      }

      event.preventDefault()

      // A new gesture starts after a pause, or when the wheel suddenly speeds up again:
      // momentum only ever fades, so a jump in speed is the next swipe.
      const delta = Math.abs(event.deltaY)
      const isNewGesture = now - lastWheel > GESTURE_GAP_MS || (delta > lastDelta * 2 && delta >= 10)
      lastWheel = now
      lastDelta = delta
      if (scrolling || !isNewGesture) return

      const sections = [...document.querySelectorAll<HTMLElement>(selector)]
      const target = sections[closestIndex(sections) + direction]
      if (!target) return

      scrolling = true
      target.scrollIntoView({ behavior: 'smooth' })
      window.addEventListener('scrollend', scrollDone, { once: true })
      // scrollend can be missing (older Safari) or never fire if nothing moved.
      scrollTimer = window.setTimeout(scrollDone, 1000)
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('scrollend', scrollDone)
      window.clearTimeout(scrollTimer)
    }
  }, [selector])
}

// The section whose top is nearest the top of the screen
function closestIndex(sections: HTMLElement[]): number {
  let best = 0
  sections.forEach((section, index) => {
    if (Math.abs(section.getBoundingClientRect().top) < Math.abs(sections[best].getBoundingClientRect().top)) {
      best = index
    }
  })
  return best
}

// The nearest box under the pointer that scrolls on its own (a list panel), if any
function scrollableAncestor(target: EventTarget | null): Element | null {
  for (let node = target instanceof Element ? target : null; node && node !== document.body; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

function canScroll(node: Element, direction: number): boolean {
  if (direction < 0) return node.scrollTop > 0
  return node.scrollTop + node.clientHeight < node.scrollHeight - 1
}
