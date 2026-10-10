import { Box, DialogContent, Divider, List, ListItem, ListItemText, Palette, Typography } from '@mui/material'
import { keyframes, styled } from '@mui/material/styles'
import { FC, ReactNode, useContext } from 'react'

import BasicModal from './BasicModal'
import { GradientCard, withoutTransientProps } from './Layout'
import { OnlineContext } from '../../service/OnlineContext'

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const slideIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`

export const OverviewActionItem = styled(
  'div',
  withoutTransientProps,
)<{ $delay?: number }>(({ theme, $delay }) => ({
  display: 'flex',
  alignItems: 'center',
  borderRadius: theme.radius.card,
  width: '100%',
  margin: theme.spacing(0.5, 0),
  padding: theme.spacing(2),
  cursor: 'pointer',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  animation: `${slideIn} 0.3s ease-out both`,
  animationDelay: `${($delay || 0) * 0.1}s`,
  '@media (hover: hover)': {
    '&:hover': {
      backgroundColor: theme.palette.surface.muted,
      transform: 'translateX(8px)',
    },
    '&:hover > :first-of-type': {
      transform: 'scale(1.25)',
    },
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
    gap: theme.spacing(0.5),
    margin: 0,
    padding: theme.spacing(1),
    textAlign: 'center',
    '&:hover': { backgroundColor: theme.palette.surface.muted, transform: 'none' },
    '& .MuiListItemText-secondary': { display: 'none' },
    '& .MuiListItemText-root': { margin: 0 },
    '& .MuiListItemText-primary': { fontSize: '0.75rem', fontWeight: 500, lineHeight: 1.3 },
    '& > :first-of-type': { fontSize: '1.25rem' },
  },
}))

export const OverviewActionIcon = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'scale(1)',
  [theme.breakpoints.down('sm')]: { padding: theme.spacing(0.5), display: 'flex' },
}))

export const OverviewItem = styled(
  GradientCard,
  withoutTransientProps,
)<{ $delay?: number }>(({ theme, $delay }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  animation: `${fadeIn} 0.3s ease-out both`,
  [theme.breakpoints.down('sm')]: { gap: theme.spacing(1), padding: theme.spacing(1, 1.5) },
  animationDelay: `${($delay || 0) * 0.1}s`,
}))

type DetailCardProps = {
  delay?: number
  title: string
  subTitle?: string
  value: string
}

export const DetailCard: FC<DetailCardProps> = (props) => {
  return (
    <OverviewItem $delay={props.delay} $selected={false} $withGradientBackground $hoverEffect={false}>
      <ListItemText
        primary={props.title}
        secondary={props.subTitle}
        slotProps={{
          primary: { color: 'text.secondary' },
          secondary: { variant: 'caption', color: 'text.disabled' },
        }}
      />
      <Typography sx={{ fontWeight: 500, fontFamily: 'monospace', letterSpacing: '0.05em', flexShrink: 0 }}>
        {props.value}
      </Typography>
    </OverviewItem>
  )
}

export const DetailHeading: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: { xs: 1, sm: 2 } }}>
    {children}
  </Typography>
)

export const FancyDialog: FC<{ open: boolean; onClose(): void; children: ReactNode }> = ({
  open,
  onClose,
  children,
}) => (
  <BasicModal
    open={open}
    onClose={onClose}
    slotProps={{
      paper: {
        sx: {
          backgroundColor: 'transparent',
          backgroundImage: 'none',
          borderRadius: (t) => t.radius.xl,
          border: 0,
          overflow: 'hidden',
          m: { xs: 2, sm: 4 },
          maxWidth: { xs: 'calc(100% - 32px)', sm: undefined },
          maxHeight: { xs: 'calc(100% - 32px)', sm: undefined },
        },
      },
    }}
  >
    {children}
  </BasicModal>
)

type FancyModalProps = {
  title: {
    topCategory: string
    bigTitle: string
    bottomSpec: {
      IconComponent: FC<{ style: { opacity: number } }>
      text: string
    }
  }
  children: ReactNode
  bottomMenu: {
    Icon: FC<object>
    label: string
    intent: keyof Palette['intent']
    description: string
    action(): void
    disabled: boolean
    availableOffline?: boolean
  }[]
}

export const FancyModal: FC<FancyModalProps> = (props) => {
  const online = useContext(OnlineContext)

  return (
    <DialogContent
      sx={{
        padding: 0,
        background: (t) =>
          `linear-gradient(to bottom, ${t.palette.overlay.panelTop}, ${t.palette.overlay.panelBottom})`,
        backdropFilter: 'blur(48px)',
        border: 1,
        borderColor: 'surface.raised',
        borderRadius: 'inherit',
        minWidth: (t) => ({ xs: 0, sm: t.contentWidth.modal }),
        maxWidth: { xs: 'none', sm: '90vw' },
        boxShadow: (t) => t.elevation.card,
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <Box
        sx={{
          background: (t) => `linear-gradient(to top right, ${t.palette.surface.muted}, ${t.palette.border.subtle})`,
          p: { xs: 2.5, sm: 5 },
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: (t) => `radial-gradient(circle at top right, ${t.palette.surface.strong} 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {props.title.topCategory}
        </Typography>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 600,
            mb: { xs: 1, sm: 2.5 },
            fontSize: { xs: '1.25rem', sm: undefined },
            letterSpacing: '0.05em',
            background: (t) => `linear-gradient(to right, ${t.palette.common.white}, ${t.palette.text.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {props.title.bigTitle}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <props.title.bottomSpec.IconComponent style={{ opacity: 0.5 }} />
          {props.title.bottomSpec.text}
        </Typography>
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 } }}>{props.children}</Box>

      <Divider sx={{ opacity: 0.5 }} />

      <List
        sx={{
          p: { xs: 1, sm: 2 },
          display: { xs: 'grid', sm: 'block' },
          gridAutoFlow: 'column',
          gridAutoColumns: 'minmax(0, 1fr)',
          gap: 0.5,
        }}
      >
        {props.bottomMenu
          .filter((item) => !item.disabled)
          .map((item, index) => {
            const unavailable = !online && !item.availableOffline
            return (
              <ListItem
                key={item.label}
                component="div"
                onClick={unavailable ? undefined : item.action}
                aria-disabled={unavailable}
                sx={{ p: 0, ...(unavailable && { opacity: 0.4, pointerEvents: 'none' }) }}
              >
                <OverviewActionItem $delay={index}>
                  <Box component={OverviewActionIcon} sx={{ color: `intent.${item.intent}` }}>
                    <item.Icon />
                  </Box>
                  <ListItemText
                    primary={item.label}
                    secondary={unavailable ? 'Unavailable offline' : item.description}
                    slotProps={{ secondary: { variant: 'caption', color: 'text.disabled' } }}
                  />
                </OverviewActionItem>
              </ListItem>
            )
          })}
      </List>
    </DialogContent>
  )
}
