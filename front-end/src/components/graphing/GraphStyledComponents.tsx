import { styled } from '@mui/material/styles'

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

export const GraphTooltipLabel = styled('div')(({ theme }) => ({
  color: theme.palette.text.primary,
  fontSize: theme.typography.body2.fontSize,
  maxWidth: '20rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  [theme.breakpoints.down('sm')]: {
    maxWidth: '40vw',
  },
}))

export const GraphTooltipValue = styled('div')(({ theme }) => ({
  marginLeft: 'auto',
  color: theme.palette.text.primary,
  fontSize: theme.typography.body2.fontSize,
}))

export const gainColor = (value: number) => (value < 0 ? 'error.light' : 'success.light')
