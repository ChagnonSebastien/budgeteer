import { Button } from '@mui/material'
import { styled, Theme } from '@mui/material/styles'
import React, { FC, ReactNode, RefObject, useEffect, useState } from 'react'

import { Column, MaxSpaceNoOverflow } from './Layout'
import { useElementDimensions } from './useDimensions'

export const CustomScrolling = styled(Column)(({ theme }) => ({
  overflowY: 'auto',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  '&::-webkit-scrollbar': {
    width: 6,
    height: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.border.default,
    borderRadius: 3,
    transition: 'background-color 200ms',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: theme.palette.border.strong,
  },
  scrollbarColor: `${theme.palette.border.default} transparent`,
}))

export const FadingDivider = styled('div', { shouldForwardProp: (prop) => prop !== 'opacity' })<{
  opacity: number
}>(({ theme, opacity }) => ({
  height: theme.spacing(2),
  borderTop: '1px solid transparent',
  borderImage: `linear-gradient(to right, transparent, ${theme.palette.border.subtle} 20%, ${theme.palette.border.subtle} 80%, transparent) 1`,
  background: `radial-gradient(ellipse 100% 100% at 50% 0%, ${theme.palette.surface.muted} 0%, transparent 50%, transparent 100%)`,
  opacity,
}))

const ScrollingOverButton: FC<{
  button?: { text: string; onClick(): void }
  children: ReactNode
  scrollingContainerRef?: RefObject<HTMLDivElement | null>
  contentWidth?: keyof Theme['contentWidth']
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
    <MaxSpaceNoOverflow
      sx={{ maxWidth: props.contentWidth && ((t) => t.contentWidth[props.contentWidth!]) }}
      ref={setContentRef}
    >
      <Column style={{ height: `${contentHeight - (props.button ? optionsHeight : 0)}px`, position: 'relative' }}>
        {props.children}
      </Column>
      {props.button && (
        <div ref={setOptionsRef}>
          <FadingDivider opacity={scrollProgress} />
          <Button fullWidth variant="contained" onClick={props.button.onClick}>
            {props.button.text}
          </Button>
        </div>
      )}
    </MaxSpaceNoOverflow>
  )
}

export default ScrollingOverButton
