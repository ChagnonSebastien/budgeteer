import { AppBar, Box, Button, IconButton, TextField, Toolbar, Typography } from '@mui/material'
import { FC, ReactNode, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'

export interface ContentWithHeaderProps {
  children: ReactNode | ReactNode[]
  title: string
  button: 'menu' | 'return' | 'none'
  onSearch?: (query: string) => void
  onCancel?: () => void
  rightButton?: ReactNode
  contentPadding?: string
  contentMaxWidth?: string
  contentOverflowY?: string
  setContentRef?: (value: ((prevState: HTMLDivElement | null) => HTMLDivElement | null) | HTMLDivElement | null) => void
}

const ContentWithHeader: FC<ContentWithHeaderProps> = (props) => {
  const {
    title,
    children,
    button: buttonOption,
    onSearch,
    onCancel,
    rightButton,
    contentPadding = '1rem',
    contentMaxWidth = '50rem',
    contentOverflowY = 'scroll',
    setContentRef = undefined,
  } = props
  const { IconLib } = useContext(IconToolsContext)
  const { open } = useContext(DrawerContext)
  const navigate = useNavigate()

  let button = null
  switch (buttonOption) {
    case 'return':
      button = (
        <IconButton onClick={() => navigate(-1)}>
          <IconLib.MdKeyboardBackspace />
        </IconButton>
      )
      break
    case 'menu':
      if (typeof open !== 'undefined')
        button = (
          <IconButton onClick={open}>
            <IconLib.MdMenu />
          </IconButton>
        )
      break
  }

  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box>
        <AppBar position="static">
          <Toolbar>
            {button}
            {typeof onCancel !== 'undefined' && <Button onClick={onCancel}>Cancel</Button>}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            {typeof rightButton !== 'undefined' && rightButton}
          </Toolbar>
          {typeof onSearch !== 'undefined' && (
            <Toolbar>
              <TextField
                onChange={(event) => onSearch(event.target.value ?? '')}
                sx={{ width: '100%' }}
                variant="standard"
                placeholder="Search..."
                autoFocus
              />
            </Toolbar>
          )}
        </AppBar>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          height: '100%',
          width: '100%',
          overflowY: contentOverflowY,
          overflowX: 'hidden',
          margin: 'auto',
          padding: contentPadding,
          maxWidth: contentMaxWidth,
        }}
        ref={setContentRef}
      >
        {children}
      </Box>
    </div>
  )
}

export default ContentWithHeader
