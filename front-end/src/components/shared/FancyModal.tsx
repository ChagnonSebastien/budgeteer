import { DialogContent, Divider, List, ListItem, ListItemText, Typography } from '@mui/material'
import { FC, ReactNode } from 'react'
import { default as styled, keyframes } from 'styled-components'

import { GradientCard } from './Layout'

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

export const OverviewActionItem = styled.div<{ $delay?: number }>`
  display: flex;
  align-items: center;
  border-radius: 16px;
  width: 100%;
  margin: 4px 0;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${slideIn} 0.3s ease-out both;
  animation-delay: ${(props) => (props.$delay || 0) * 0.1}s;

  &:hover {
    background-color: rgba(128, 128, 128, 0.1);
    transform: translateX(8px);
  }

  &:hover > :first-child {
    transform: scale(1.25);
  }
`

export const OverviewActionIcon = styled.div`
  padding: 1rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(1);
`

export const OverviewItem = styled(GradientCard)<{ $delay?: number }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  animation: ${fadeIn} 0.3s ease-out both;
  animation-delay: ${(props) => (props.$delay || 0) * 0.1}s;
`

type DetailCardProps = {
  delay?: number
  title: string
  subTitle?: string
  value: string
}

export const DetailCard: FC<DetailCardProps> = (props) => {
  return (
    <OverviewItem
      $delay={props.delay}
      style={{ gap: '1rem' }}
      $selected={false}
      $withGradientBackground
      $hoverEffect={false}
    >
      <ListItemText
        primary={props.title}
        secondary={props.subTitle}
        slotProps={{
          primary: { style: { opacity: 0.7 } },
          secondary: { style: { fontSize: '0.75rem', opacity: 0.5 } },
        }}
      />
      <Typography
        variant="body1"
        style={{
          fontWeight: 500,
          fontFamily: 'monospace',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}
      >
        {props.value}
      </Typography>
    </OverviewItem>
  )
}

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
    color: string
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
        background: 'linear-gradient(to bottom, rgba(15,15,15,0.98), rgba(10,10,10,0.98))',
        backdropFilter: 'blur(48px)',
        border: '1px solid rgba(128,128,128,0.16)',
        minWidth: '320px',
        maxWidth: '90vw',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease-in-out',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(to top right, rgba(128,128,128,0.1), rgba(128,128,128,0.2))',
          padding: '40px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'radial-gradient(circle at top right, rgba(128,128,128,0.24) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '100%',
            background: 'linear-gradient(to right, transparent, rgba(128,128,128,0.06))',
            pointerEvents: 'none',
          }}
        />
        <Typography
          variant="overline"
          style={{
            opacity: 0.6,
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: '4px',
            fontSize: '0.75rem',
          }}
        >
          {props.title.topCategory}
        </Typography>
        <Typography
          variant="h5"
          style={{
            fontWeight: 600,
            marginBottom: '20px',
            letterSpacing: '0.05em',
            background: 'linear-gradient(to right, white, rgba(255,255,255,0.7))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {props.title.bigTitle}
        </Typography>
        <Typography
          variant="body2"
          style={{
            opacity: 0.7,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <props.title.bottomSpec.IconComponent style={{ opacity: 0.5 }} />
          {props.title.bottomSpec.text}
        </Typography>
      </div>

      <div style={{ padding: '1.5rem' }}>{props.children}</div>

      <Divider style={{ opacity: 0.5 }} />

      <List style={{ padding: '1rem' }}>
        {props.bottomMenu
          .filter((item) => !item.disabled)
          .map((item, index) => (
            <ListItem key={item.label} component="div" onClick={item.action} style={{ padding: 0 }}>
              <OverviewActionItem $delay={index}>
                <OverviewActionIcon style={{ color: item.color }}>
                  <item.Icon />
                </OverviewActionIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.description}
                  slotProps={{
                    secondary: { style: { fontSize: '0.75rem', opacity: 0.5 } },
                  }}
                />
              </OverviewActionItem>
            </ListItem>
          ))}
      </List>
    </DialogContent>
  )
}
