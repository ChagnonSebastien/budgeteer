import { Dialog, DialogProps } from '@mui/material'
import { FC, useContext } from 'react'
import styled from 'styled-components'

import { DrawerContext } from './Menu'
import '../styles/dialog-components-tailwind.css'

const StyledDialog = styled(Dialog)<{ $isPersistentDrawer: boolean; $drawerWidth: number }>`
  ${(props) =>
    props.$isPersistentDrawer &&
    `
    --drawer-width: ${props.$drawerWidth}px;
    
    & .MuiBackdrop-root {
      left: ${props.$drawerWidth}px;
      width: calc(100% - ${props.$drawerWidth}px);
    }
    
    & .MuiDialog-paper {
      position: relative;
      left: ${props.$drawerWidth / 2}px;
    }
  `}
`

const ContentDialog: FC<DialogProps> = (props) => {
  const { open, drawerWidth } = useContext(DrawerContext)
  const isPersistentDrawer = !open // If open() function doesn't exist, it means we're in persistent drawer mode

  return <StyledDialog {...props} $isPersistentDrawer={isPersistentDrawer} $drawerWidth={drawerWidth} />
}

export default ContentDialog
