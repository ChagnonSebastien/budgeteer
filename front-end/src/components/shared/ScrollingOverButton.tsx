import { Button } from '@mui/material'
import React, { FC, ReactNode, RefObject, useEffect, useState } from 'react'

import { FadingDivider, ListContentContainer, PageContainer, ScrollAreaContainer } from './PageStyledComponents'

const ScrollingOverButton: FC<{
  button: { text: string; onClick(): void }
  children: ReactNode
  scrollingContainerRef?: RefObject<HTMLDivElement>
}> = (props) => {
  const [optionsHeight, setOptionsHeight] = useState(240)
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null)
  const [contentHeight, setContentHeight] = useState(600)
  const [scrollProgress, setScrollProgress] = useState(1)

  useEffect(() => {
    if (contentRef === null) return
    const ref = contentRef

    const callback = () => {
      setContentHeight(ref.clientHeight)
    }
    callback()

    window.addEventListener('resize', callback)
    return () => window.removeEventListener('resize', callback)
  }, [contentRef])

  useEffect(() => {
    if (!setScrollProgress || !props.scrollingContainerRef || !props.scrollingContainerRef.current) return

    const handleScroll = () => {
      const element = props.scrollingContainerRef?.current
      if (element) {
        const maxScroll = element.scrollHeight - element.clientHeight
        const bufferZone = 64 // 4rem
        if (maxScroll <= 0) {
          setScrollProgress?.(0)
        } else {
          const remainingScroll = maxScroll - element.scrollTop
          if (remainingScroll > bufferZone) {
            setScrollProgress?.(1)
          } else {
            const progress = remainingScroll / bufferZone
            setScrollProgress?.(Math.max(0, Math.min(1, progress)))
          }
        }
      }
    }

    handleScroll()
    props.scrollingContainerRef.current.addEventListener('scroll', handleScroll)
    const observer = new ResizeObserver(handleScroll)
    observer.observe(props.scrollingContainerRef.current)

    return () => {
      if (props.scrollingContainerRef?.current) {
        props.scrollingContainerRef.current.removeEventListener('scroll', handleScroll)
      }
      observer.disconnect()
    }
  }, [])

  return (
    <PageContainer ref={setContentRef}>
      <ListContentContainer>
        <ScrollAreaContainer style={{ height: `${contentHeight - optionsHeight}px` }}>
          {props.children}
        </ScrollAreaContainer>
        <div
          ref={(ref) => {
            if (ref !== null) setOptionsHeight(ref.scrollHeight)
          }}
          className="overflow-hidden"
        >
          <FadingDivider opacity={scrollProgress} />
          <Button fullWidth variant="contained" onClick={props.button.onClick}>
            {props.button.text}
          </Button>
        </div>
      </ListContentContainer>
    </PageContainer>
  )
}

export default ScrollingOverButton
