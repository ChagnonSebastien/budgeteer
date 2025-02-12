import { Dialog, DialogProps } from '@mui/material'
import { FC, useContext } from 'react'

import { DrawerContext } from './Menu'

const ContentDialog: FC<DialogProps> = (props) => {
  const { open, drawerWidth } = useContext(DrawerContext)
  const isPersistentDrawer = !open // If open() function doesn't exist, it means we're in persistent drawer mode

  return (
    <Dialog
      {...props}
      sx={{
        ...(isPersistentDrawer && {
          '& .MuiBackdrop-root': {
            left: `${drawerWidth}px`,
            width: `calc(100% - ${drawerWidth}px)`,
          },
          '& .MuiDialog-paper': {
            position: 'relative',
            left: `${drawerWidth / 2}px`,
          },
        }),
        ...props.sx,
      }}
    />
  )
}

export default ContentDialog
