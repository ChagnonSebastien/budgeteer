import { Dialog, DialogProps } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, useContext } from 'react'

import { withoutTransientProps } from './Layout'
import useCloseOnBack from './useCloseOnBack'
import { DrawerContext } from '../Menu'

const StyledDialog = styled(
  Dialog,
  withoutTransientProps,
)<{ $isPersistentDrawer: boolean; $drawerWidth: number }>(({ $isPersistentDrawer, $drawerWidth }) =>
  $isPersistentDrawer
    ? {
        '--drawer-width': `${$drawerWidth}px`,
        '& .MuiBackdrop-root': {
          left: `${$drawerWidth}px`,
          width: `calc(100% - ${$drawerWidth}px)`,
        },
        '& .MuiDialog-paper': {
          position: 'relative',
          left: `${$drawerWidth / 2}px`,
        },
      }
    : {},
)

const BasicModal: FC<DialogProps> = (props) => {
  const { open, drawerWidth } = useContext(DrawerContext)
  const isPersistentDrawer = !open // If open() function doesn't exist, it means we're in persistent drawer mode
  useCloseOnBack(props.open, () => props.onClose?.({}, 'backdropClick'))

  return <StyledDialog {...props} $isPersistentDrawer={isPersistentDrawer} $drawerWidth={drawerWidth} />
}

export default BasicModal
