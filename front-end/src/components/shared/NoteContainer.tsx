import { Box, SxProps, Theme, Typography } from '@mui/material'
import React, { FC, ReactNode } from 'react'
import { css, default as styled } from 'styled-components'

interface Props {
  title: string
  children: ReactNode
  sx?: SxProps<Theme> | undefined
}

const NoteContainer: FC<Props> = (props) => (
  <>
    <Row style={{ marginTop: '1rem' }}>
      <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>{props.title}</div>
      <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
    </Row>
    <Box
      sx={{
        ...props.sx,
        padding: `2rem ${window.innerWidth > 600 ? '1' : '0'}rem`,
        border: '1px grey solid',
        borderTop: 0,
      }}
    >
      {props.children}
    </Box>
  </>
)

export const MaxSpaceNoOverflow = styled.div`
  height: 100%;
  width: 100%;
  overflow: hidden;
`

export const Centered = styled(MaxSpaceNoOverflow)`
  display: flex;
  justify-content: center;
  align-items: center;
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
`

export const Row = styled.div`
  display: flex;
  flex-direction: row;
`

export const TinyHeader = styled(Typography)`
  font-size: 0.75rem;
`

export const GradientCard = styled.div<{
  $selected: boolean
  $withGradientBackground: boolean
  $hoverEffect: boolean
}>`
  border-radius: 0.5rem;
  transition: all 200ms ease-in-out;
  border-left: 3px solid transparent;
  margin: 0.125rem 0;
  cursor: pointer;

  ${({ $withGradientBackground }) =>
    $withGradientBackground &&
    css`
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 1rem;
      backdrop-filter: blur(12px);
      box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.1),
        0 2px 4px -1px rgba(0, 0, 0, 0.06);
      margin: 0.25rem 0;
    `}

  ${({ $selected }) =>
    $selected &&
    css`
      background-color: rgba(200, 75, 49, 0.12);
      border-left-color: #c84b31;
    `}

  ${({ $hoverEffect, $withGradientBackground, $selected }) =>
    $hoverEffect &&
    css`
      &:hover {
        background-color: rgba(255, 255, 255, 0.08);
        transform: translateY(-2px);

        ${() =>
          $withGradientBackground &&
          css`
            transform: translateY(-2px) scale(1.01);
            box-shadow:
              0 10px 15px -3px rgba(0, 0, 0, 0.1),
              0 4px 6px -2px rgba(0, 0, 0, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
          `}

        ${() =>
          $selected &&
          css`
            background-color: rgba(200, 75, 49, 0.16);
          `}
      }
    `}
`

export default NoteContainer
