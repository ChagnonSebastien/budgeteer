import { Box, SxProps, Theme } from '@mui/material'
import { FC, ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  sx?: SxProps<Theme> | undefined
}

const NoteContainer: FC<Props> = (props) => (
  <>
    <div style={{ display: 'flex', marginTop: '1rem' }}>
      <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>{props.title}</div>
      <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
    </div>
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

export default NoteContainer
