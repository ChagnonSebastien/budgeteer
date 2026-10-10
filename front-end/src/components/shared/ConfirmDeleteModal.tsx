import { Button, Stack, Typography } from '@mui/material'
import { FC } from 'react'

import BasicModal from './BasicModal'
import { SecureButton } from './SecureButton'

const ConfirmDeleteModal: FC<{
  open: boolean
  title: string
  description: string
  onCancel(): void
  onConfirm(): Promise<void>
}> = ({ open, title, description, onCancel, onConfirm }) => (
  <BasicModal open={open} onClose={onCancel}>
    <Stack spacing={2} sx={{ p: 3, maxWidth: (t) => t.contentWidth.dialog }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button variant="text" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <SecureButton variant="contained" color="error" onClick={onConfirm}>
          Delete
        </SecureButton>
      </Stack>
    </Stack>
  </BasicModal>
)

export default ConfirmDeleteModal
