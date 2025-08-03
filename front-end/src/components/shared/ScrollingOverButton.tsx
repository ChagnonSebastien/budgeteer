import { Button } from '@mui/material'
import React, { CSSProperties, FC, ReactNode, RefObject, useEffect, useState } from 'react'
import { default as styled } from 'styled-components'

import { Column, MaxSpaceNoOverflow } from './Layout'
import { useElementDimensions } from './useDimensions'

export const CustomScrolling = styled(Column)`
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
    background: rgba(128, 128, 128, 0.4);
    border-radius: 3px;
    transition: background-color 200ms;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgba(128, 128, 128, 0.6);
  }

  /* Firefox scrollbar styling */
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
`

export const FadingDivider = styled.div<{ opacity: number }>`
  height: 1rem;
  border-top: 1px solid transparent;
  border-image: linear-gradient(to right, transparent, #fff4 20%, #fff4 80%, transparent) 1;
  background: radial-gradient(ellipse 100% 100% at 50% 0%, #fff2 0%, #fff0 50%, transparent 100%);
  opacity: ${(props) => props.opacity};
`

const ScrollingOverButton: FC<{
  button: { text: string; onClick(): void }
  children: ReactNode
  scrollingContainerRef?: RefObject<HTMLDivElement | null>
  contentStyle?: CSSProperties
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
    <MaxSpaceNoOverflow style={props.contentStyle} ref={setContentRef}>
      <Column style={{ height: `${contentHeight - optionsHeight}px`, position: 'relative' }}>{props.children}</Column>
      <div ref={setOptionsRef}>
        <FadingDivider opacity={scrollProgress} />
        <Button fullWidth variant="contained" onClick={props.button.onClick}>
          {props.button.text}
        </Button>
      </div>
    </MaxSpaceNoOverflow>
  )
}

export default ScrollingOverButton
