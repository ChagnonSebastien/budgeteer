import { AppBar, Box, Button, IconButton, TextField, Toolbar, Typography } from '@mui/material'
import { FC, ReactNode, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'

import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'

const SearchField = styled(TextField)`
  width: 100%;
`

export const ContentWithHeaderContainer = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`

export const ContentContainer = styled(Box)<{ $maxWidth: string; $padding: string; $overflowY: string }>`
  flex-grow: 1;
  height: 100%;
  width: 100%;
  overflow-y: ${(props) => props.$overflowY};
  overflow-x: hidden;
  margin: auto;
  padding: ${(props) => props.$padding};
  max-width: ${(props) => props.$maxWidth};
`

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
    contentOverflowY = 'auto',
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
    <ContentWithHeaderContainer>
      <Box>
        <AppBar position="static">
          <Toolbar>
            {button}
            {typeof onCancel !== 'undefined' && <Button onClick={onCancel}>Cancel</Button>}
            <Typography variant="h6" component="div" className="flex-grow">
              {title}
            </Typography>
            {typeof rightButton !== 'undefined' && rightButton}
          </Toolbar>
          {typeof onSearch !== 'undefined' && (
            <Toolbar>
              <SearchField
                onChange={(event) => onSearch(event.target.value ?? '')}
                variant="standard"
                placeholder="Search..."
                autoFocus
                className="w-full"
              />
            </Toolbar>
          )}
        </AppBar>
      </Box>

      <ContentContainer
        $overflowY={contentOverflowY}
        $padding={contentPadding}
        $maxWidth={contentMaxWidth}
        ref={setContentRef}
      >
        {children}
      </ContentContainer>
    </ContentWithHeaderContainer>
  )
}

export default ContentWithHeader
