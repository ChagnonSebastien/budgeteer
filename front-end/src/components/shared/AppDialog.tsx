import { Breakpoint, DialogActions, DialogContent, DialogTitle, SxProps, Theme } from '@mui/material'
import { FC, ReactNode } from 'react'

import BasicModal from './BasicModal'

interface AppDialogProps {
  open: boolean
  onClose(): void
  title: ReactNode
  children: ReactNode
  actions?: ReactNode
  maxWidth?: Breakpoint | false
  fullWidth?: boolean
  fullScreen?: boolean
  contentSx?: SxProps<Theme>
  disableRestoreFocus?: boolean
}

const AppDialog: FC<AppDialogProps> = ({
  open,
  onClose,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = false,
  fullScreen = false,
  contentSx,
  disableRestoreFocus = false,
}) => (
  <BasicModal
    open={open}
    onClose={onClose}
    maxWidth={maxWidth}
    fullWidth={fullWidth}
    fullScreen={fullScreen}
    disableRestoreFocus={disableRestoreFocus}
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent sx={contentSx}>{children}</DialogContent>
    {actions && <DialogActions>{actions}</DialogActions>}
  </BasicModal>
)

export default AppDialog
