import { useEffect, useRef, useState } from 'react'

/** Measured width of a container, so charts can lay out in real pixels
 *  instead of being scaled by a viewBox (which distorts label sizes). */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    observer.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}
