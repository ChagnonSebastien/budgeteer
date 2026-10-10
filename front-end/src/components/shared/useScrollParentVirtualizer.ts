import { useVirtualizer } from '@tanstack/react-virtual'
import { Key, useLayoutEffect, useRef, useState } from 'react'

const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
  for (let node = element?.parentElement ?? null; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return document.scrollingElement as HTMLElement | null
}

interface Options {
  count: number
  estimateSize(index: number): number
  getItemKey(index: number): Key
  overscan: number
}

const useScrollParentVirtualizer = ({ count, estimateSize, getItemKey, overscan }: Options) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  useLayoutEffect(() => {
    setScrollElement(findScrollParent(listRef.current))
  }, [])

  // The list sits below other content in a shared scroll container; its offset moves when that content resizes.
  useLayoutEffect(() => {
    if (!listRef.current || !scrollElement) return
    const offset =
      listRef.current.getBoundingClientRect().top - scrollElement.getBoundingClientRect().top + scrollElement.scrollTop
    if (Math.abs(offset - scrollMargin) > 1) setScrollMargin(offset)
  })

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollElement,
    estimateSize,
    getItemKey,
    overscan,
    scrollMargin,
  })

  return { listRef, virtualizer, scrollMargin }
}

export default useScrollParentVirtualizer
