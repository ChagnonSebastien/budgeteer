import { useEffect, useState } from 'react'

type Dimensions = { height: number; width: number; boundingRect?: DOMRect }

export const useElementDimensions = (defaultHeight: number, defaultWidth: number) => {
  const [dimensions, setDimensions] = useState<Dimensions>({ height: defaultHeight, width: defaultWidth })

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setDimensions({ height: ref.clientHeight, width: ref.clientWidth, boundingRect: ref.getBoundingClientRect() })
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  return {
    ref: setContentRef,
    ...dimensions,
  }
}

export const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({ height: window.innerHeight, width: window.innerWidth })

  useEffect(() => {
    const callback = () => {
      setDimensions({ height: window.innerHeight, width: window.innerWidth })
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [])

  return dimensions
}

export default { useElementDimensions, useWindowDimensions }
