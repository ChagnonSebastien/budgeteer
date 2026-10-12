import { Box, Button, Stack, SxProps, Theme, Typography } from '@mui/material'
import { alpha, styled } from '@mui/material/styles'
import React, { FC, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

interface SectionProps {
  title: string
  children: ReactNode
  compact?: boolean
  sx?: SxProps<Theme> | undefined
}

export const Section: FC<SectionProps> = ({ title, children, compact = false, sx }) => (
  <Box>
    <Stack direction="row">
      <Typography
        variant={compact ? 'caption' : 'body1'}
        color={compact ? 'text.secondary' : 'text.disabled'}
        sx={{ mx: 2, transform: (t) => `translateY(${t.spacing(1)})` }}
      >
        {title}
      </Typography>
      <Box sx={{ flexGrow: 1, borderBottom: 1, borderColor: 'border.strong' }} />
    </Stack>
    <Box
      sx={{
        ...(compact ? { p: 2 } : { py: 4, px: { xs: 0, sm: 2 } }),
        border: 1,
        borderTop: 0,
        borderColor: 'border.strong',
        ...sx,
      }}
    >
      {children}
    </Box>
  </Box>
)

export const PageBody: FC<{ children: ReactNode; width?: keyof Theme['contentWidth'] }> = ({
  children,
  width = 'default',
}) => (
  <Stack spacing={2} sx={{ width: '100%', maxWidth: (t) => t.contentWidth[width] }}>
    {children}
  </Stack>
)

export const Stat: FC<{ label: string; value: ReactNode }> = ({ label, value }) => (
  <Stack>
    <Typography variant="label" color="text.disabled">
      {label}
    </Typography>
    <Typography variant="stat">{value}</Typography>
  </Stack>
)

const EmptyStateAction: FC<{ label: string; path: string }> = ({ label, path }) => {
  const navigate = useNavigate()
  return (
    <Button variant="contained" disableElevation onClick={() => navigate(path)} sx={{ mt: 1 }}>
      {label}
    </Button>
  )
}

export const EmptyState: FC<{
  title: string
  description?: string
  compact?: boolean
  action?: { label: string; path: string }
}> = ({ title, description, compact = false, action }) => (
  <Stack
    sx={{
      gap: 1,
      alignItems: 'center',
      textAlign: 'center',
      maxWidth: (t) => t.contentWidth.compact,
      px: 2,
      mx: 'auto',
      ...(compact ? { my: 'auto' } : { mt: '30vh' }),
    }}
  >
    <Typography variant="h6" color="text.secondary">
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.disabled">
        {description}
      </Typography>
    )}
    {action && <EmptyStateAction {...action} />}
  </Stack>
)

export const withoutTransientProps = {
  shouldForwardProp: (prop: PropertyKey) => !String(prop).startsWith('$'),
}

export const MaxSpace = styled('div')({
  height: '100%',
  width: '100%',
})

export const MaxSpaceNoOverflow = styled(MaxSpace)({
  overflow: 'hidden',
})

export const Centered = styled(MaxSpaceNoOverflow)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
})

export const Column = styled('div')({
  display: 'flex',
  flexDirection: 'column',
})

export const Row = styled('div')({
  display: 'flex',
  flexDirection: 'row',
})

export const GradientCard = styled(
  'div',
  withoutTransientProps,
)<{
  $selected: boolean
  $withGradientBackground: boolean
  $hoverEffect: boolean
}>(({ theme, $selected, $withGradientBackground, $hoverEffect }) => ({
  borderRadius: theme.radius.md,
  transition: 'all 200ms ease-in-out',
  borderLeft: '3px solid transparent',
  cursor: 'pointer',
  ...($withGradientBackground && {
    background: `linear-gradient(135deg, ${theme.palette.surface.muted} 0%, ${theme.palette.surface.subtle} 100%)`,
    border: `1px solid ${theme.palette.surface.raised}`,
    borderRadius: theme.radius.card,
    backdropFilter: 'blur(12px)',
    boxShadow: theme.elevation.subtle,
    margin: theme.spacing(0.5, 0),
  }),
  ...($selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderLeftColor: theme.palette.primary.main,
  }),
  ...($hoverEffect && {
    '@media (hover: hover)': {
      '&:hover': {
        backgroundColor: $selected ? alpha(theme.palette.primary.main, 0.16) : theme.palette.surface.raised,
        transform: $withGradientBackground ? 'translateY(-2px) scale(1.01)' : 'translateY(-2px)',
        ...($withGradientBackground && {
          boxShadow: theme.elevation.card,
          borderColor: theme.palette.border.default,
        }),
      },
    },
  }),
}))
