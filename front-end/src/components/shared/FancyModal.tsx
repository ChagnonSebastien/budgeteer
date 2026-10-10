import { Box, DialogContent, Divider, List, ListItem, ListItemText, Palette, Typography } from '@mui/material'
import { keyframes, styled } from '@mui/material/styles'
import { FC, ReactNode } from 'react'

import BasicModal from './BasicModal'
import { GradientCard, withoutTransientProps } from './Layout'

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
  '&:hover': {
    backgroundColor: theme.palette.surface.muted,
    transform: 'translateX(8px)',
  },
  '&:hover > :first-of-type': {
    transform: 'scale(1.25)',
  },
}))

export const OverviewActionIcon = styled('div')(({ theme }) => ({
  padding: theme.spacing(2),
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  transform: 'scale(1)',
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
  <Typography variant="label" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
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
  }[]
}

export const FancyModal: FC<FancyModalProps> = (props) => {
  return (
    <DialogContent
      sx={{
        padding: 0,
        background: (t) =>
          `linear-gradient(to bottom, ${t.palette.overlay.panelTop}, ${t.palette.overlay.panelBottom})`,
        backdropFilter: 'blur(48px)',
        border: 1,
        borderColor: 'surface.raised',
        minWidth: (t) => t.contentWidth.modal,
        maxWidth: '90vw',
        boxShadow: (t) => t.elevation.card,
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <Box
        sx={{
          background: (t) => `linear-gradient(to top right, ${t.palette.surface.muted}, ${t.palette.border.subtle})`,
          p: 5,
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
            mb: 2.5,
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

      <Box sx={{ p: 3 }}>{props.children}</Box>

      <Divider sx={{ opacity: 0.5 }} />

      <List sx={{ p: 2 }}>
        {props.bottomMenu
          .filter((item) => !item.disabled)
          .map((item, index) => (
            <ListItem key={item.label} component="div" onClick={item.action} sx={{ p: 0 }}>
              <OverviewActionItem $delay={index}>
                <Box component={OverviewActionIcon} sx={{ color: `intent.${item.intent}` }}>
                  <item.Icon />
                </Box>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  slotProps={{ secondary: { variant: 'caption', color: 'text.disabled' } }}
                />
              </OverviewActionItem>
            </ListItem>
          ))}
      </List>
    </DialogContent>
  )
}
