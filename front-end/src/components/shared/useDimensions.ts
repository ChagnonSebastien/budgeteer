import { useEffect, useState, useCallback } from 'react'

type Dimensions = { height: number; width: number; boundingRect?: DOMRect }

export const useElementDimensions = (defaultHeight: number, defaultWidth: number) => {
  const [dimensions, setDimensions] = useState<Dimensions>({ height: defaultHeight, width: defaultWidth })

  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)

  const updateDimensions = useCallback(() => {
    if (!contentRef) return
    
    const rect = contentRef.getBoundingClientRect()
    const newDimensions = {
      height: contentRef.clientHeight,
      width: contentRef.clientWidth,
      boundingRect: rect
    }
    
    // Only update if dimensions actually changed to avoid unnecessary re-renders
    setDimensions(prev => {
      if (prev.height !== newDimensions.height || prev.width !== newDimensions.width) {
        return newDimensions
      }
      return prev
    })
  }, [contentRef])

  useEffect(() => {
    if (!contentRef) return

    // Initial measurement
    updateDimensions()

    // Use ResizeObserver for more reliable dimension tracking
    const resizeObserver = new ResizeObserver(() => {
      updateDimensions()
    })

    resizeObserver.observe(contentRef)

    // Fallback to window resize listener for older browsers
    window.addEventListener('resize', updateDimensions)

    // Also check dimensions after a short delay to handle cases where
    // the element needs time to render properly
    const timeoutId = setTimeout(updateDimensions, 100)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updateDimensions)
      clearTimeout(timeoutId)
    }
  }, [contentRef, updateDimensions])

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
