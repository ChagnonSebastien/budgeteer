import { IonSearchbar, IonMenuToggle } from '@ionic/react'
import { AppBar, Box, Button, IconButton, TextField, Toolbar, Typography } from '@mui/material'
import { FC, ReactNode, useContext } from 'react'

import { IconToolsContext } from './IconTools'

export interface ContentWithHeaderProps {
  children: ReactNode | ReactNode[]
  title: string
  button: 'menu' | 'return' | 'none'
  onSearch?: (query: string) => void
  onCancel?: () => void
  rightButton?: JSX.Element
}

const ContentWithHeader: FC<ContentWithHeaderProps> = (props) => {
  const { title, children, button: buttonOption, onSearch, onCancel, rightButton } = props
  const { IconLib } = useContext(IconToolsContext)

  let button = null
  switch (buttonOption) {
    case 'return':
      button = (
        <IonMenuToggle>
          <IconLib.MdKeyboardBackspace />
        </IonMenuToggle>
      )
      break
    case 'menu':
      button = (
        <IonMenuToggle>
          <IconLib.MdMenu />
        </IonMenuToggle>
      )
      break
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box>
        <AppBar position="static">
          <Toolbar>
            {buttonOption !== 'none' && (
              <IconButton size="large" edge="start" sx={{ mr: 2 }}>
                {button}
              </IconButton>
            )}
            {typeof onCancel !== 'undefined' && (
              <IconButton size="large">
                <Button onClick={onCancel}>Cancel</Button>
              </IconButton>
            )}
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              {title}
            </Typography>
            {typeof rightButton !== 'undefined' && <IconButton size="large">{rightButton}</IconButton>}
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

      <div style={{ flexGrow: 1, height: '100%', overflowY: 'scroll' }}>{children}</div>
    </div>
  )
}

export default ContentWithHeader
