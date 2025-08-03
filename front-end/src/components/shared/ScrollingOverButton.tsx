import { Button } from '@mui/material'
import React, { FC, ReactNode, RefObject, useEffect, useState } from 'react'
import { default as styled } from 'styled-components'

import { FadingDivider, ListContentContainer, PageContainer, ScrollAreaContainer } from './PageStyledComponents'
import { useElementDimensions } from './useDimensions'

export const CustomScrollbarContainer = styled.div`
  overflow-y: auto;
  padding-left: 1rem;
  padding-right: 1rem;

  /* Modern scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
    transition: background-color 200ms;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  /* Firefox scrollbar styling */
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
`

const ScrollingOverButton: FC<{
  button: { text: string; onClick(): void }
  children: ReactNode
  scrollingContainerRef?: RefObject<HTMLDivElement | null>
}> = (props) => {
  const [scrollProgress, setScrollProgress] = useState(1)

  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)
  const { height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)

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
        <div ref={setOptionsRef}>
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
