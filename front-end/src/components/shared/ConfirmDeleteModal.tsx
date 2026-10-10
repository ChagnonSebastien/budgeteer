import { Button, Typography } from '@mui/material'
import { FC } from 'react'

import AppDialog from './AppDialog'
import { SecureButton } from './SecureButton'

const ConfirmDeleteModal: FC<{
  open: boolean
  title: string
  description: string
  onCancel(): void
  onConfirm(): Promise<void>
}> = ({ open, title, description, onCancel, onConfirm }) => (
  <AppDialog
    open={open}
    onClose={onCancel}
    title={title}
    maxWidth="xs"
    actions={
      <>
        <Button variant="text" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <SecureButton variant="contained" color="error" onClick={onConfirm}>
          Delete
        </SecureButton>
      </>
    }
  >
    <Typography color="text.secondary">{description}</Typography>
  </AppDialog>
)

export default ConfirmDeleteModal
