import { styled } from '@mui/material/styles'
import React, { FC, useLayoutEffect, useRef } from 'react'

import { Column, withoutTransientProps } from '../shared/Layout'

export const GraphContainer = styled('div')({
  width: '100%',
  userSelect: 'none',
  WebkitUserSelect: 'none',
})

export const FirstDivision = styled('div')({
  width: '100%',
  maxWidth: '100vh',
  alignItems: 'stretch',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'stretch',
  margin: '0 auto',
  flexGrow: 1,
})

export const SecondDivision = styled(
  Column,
  withoutTransientProps,
)<{ $splitView?: boolean }>(({ theme, $splitView }) => ({
  padding: theme.spacing(2, 4),
  borderTop: $splitView ? 'none' : `1px solid ${theme.palette.border.subtle}`,
  height: $splitView ? '100%' : 'auto',
  gap: theme.spacing(4),
  alignSelf: 'stretch',
  [theme.breakpoints.down('sm')]: {
    padding: theme.spacing(1.5, 2),
    gap: theme.spacing(2),
  },
}))

export const GraphTooltip = styled('div')(({ theme }) => ({
  padding: theme.spacing(1, 1.5),
  background: theme.palette.overlay.tooltip,
  borderRadius: theme.radius.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  zIndex: 100,
  maxWidth: 'calc(100vw - 32px)',
  boxSizing: 'border-box',
  overflow: 'hidden',
  '& > *': {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
}))

export const GraphTooltipDate = styled('div')(({ theme }) => ({
  color: theme.palette.text.secondary,
  fontSize: theme.typography.body2.fontSize,
}))

export const GraphTooltipRow = styled('div')({
  display: 'flex',
  alignItems: 'center',
})

export const GraphTooltipColor = styled('div')(({ theme }) => ({
  width: theme.spacing(1.5),
  height: theme.spacing(1.5),
  borderRadius: theme.radius.sm,
  marginRight: theme.spacing(1),
}))

const GraphTooltipLabelBox = styled('div')(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: theme.typography.body2.fontSize,
  maxWidth: '20rem',
  overflow: 'hidden',
  whiteSpace: 'nowrap',
  [theme.breakpoints.down('sm')]: {
    maxWidth: '40vw',
  },
}))

const middleEllipsis = (text: string, kept: number) =>
  `${text.slice(0, Math.ceil(kept / 2)).trimEnd()}…${text.slice(text.length - Math.floor(kept / 2)).trimStart()}`

export const GraphTooltipLabel: FC<{ children: string }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)

  // Writes the DOM directly: the fitting length is only known by measuring the rendered text.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // scrollWidth rounds to whole pixels, hiding a sub-pixel overflow.
    const range = document.createRange()
    const fits = (text: string) => {
      el.textContent = text
      range.selectNodeContents(el)
      return range.getBoundingClientRect().width <= el.getBoundingClientRect().width
    }
    if (fits(children)) return
    let low = 0
    let high = children.length - 1
    while (low < high) {
      const kept = (low + high + 1) >> 1
      if (fits(middleEllipsis(children, kept))) low = kept
      else high = kept - 1
    }
    el.textContent = middleEllipsis(children, low)
  }, [children])

  return <GraphTooltipLabelBox ref={ref}>{children}</GraphTooltipLabelBox>
}

export const GraphTooltipValue = styled('div')(({ theme }) => ({
  marginLeft: 'auto',
  color: theme.palette.text.primary,
  fontSize: theme.typography.body2.fontSize,
}))

export const gainColor = (value: number) => (value < 0 ? 'error.light' : 'success.light')
