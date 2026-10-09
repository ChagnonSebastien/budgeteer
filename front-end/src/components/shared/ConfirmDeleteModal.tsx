import { Button, Typography } from '@mui/material'
import { FC } from 'react'

import BasicModal from './BasicModal'
import { Column, Row } from './Layout'
import { SecureButton } from './SecureButton'

const ConfirmDeleteModal: FC<{
  open: boolean
  title: string
  description: string
  onCancel(): void
  onConfirm(): Promise<void>
}> = ({ open, title, description, onCancel, onConfirm }) => (
  <BasicModal open={open} onClose={onCancel}>
    <Column style={{ padding: '1.5rem', gap: '1rem', maxWidth: '22rem' }}>
      <Typography variant="h6">{title}</Typography>
      <Typography color="text.secondary">{description}</Typography>
      <Row style={{ gap: '1rem', justifyContent: 'end' }}>
        <Button variant="text" color="inherit" onClick={onCancel}>
          Cancel
        </Button>
        <SecureButton variant="contained" color="error" onClick={onConfirm}>
          Delete
        </SecureButton>
      </Row>
    </Column>
  </BasicModal>
)

export default ConfirmDeleteModal
