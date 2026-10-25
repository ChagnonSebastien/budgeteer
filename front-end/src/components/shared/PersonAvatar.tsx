import { Avatar, Typography } from '@mui/material'
import { FC } from 'react'

import { Email } from '../../domain/model/transactionGroup'

const hueOf = (email: Email) => {
  let hash = 0
  for (const char of email.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 360
}

const personColor = (email: Email) => `hsl(${hueOf(email)}, 55%, 42%)`

const PersonAvatar: FC<{ email: Email; displayName: string; small?: boolean; className?: string }> = ({
  email,
  displayName,
  small = false,
  className,
}) => (
  <Avatar
    className={className}
    sx={{
      bgcolor: personColor(email),
      flexShrink: 0,
      ...(small ? { width: 24, height: 24 } : { width: 32, height: 32 }),
    }}
  >
    <Typography variant={small ? 'caption' : 'body2'} sx={{ color: 'common.white' }}>
      {displayName.charAt(0).toUpperCase()}
    </Typography>
  </Avatar>
)

export default PersonAvatar
