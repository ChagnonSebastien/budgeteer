import { Box, Stack, Typography } from '@mui/material'
import { FC, useCallback } from 'react'

import AccountForm from './AccountForm'
import { useCreateAccount } from '../../pages/CreateAccountPage'

const FirstAccountSetup: FC = () => {
  const onSubmit = useCreateAccount(useCallback(() => {}, []))

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', display: 'flex' }}>
      <Stack spacing={2} sx={{ p: 2, maxWidth: '50rem', width: '100%', m: 'auto' }}>
        <Typography variant="h5">Add your first account</Typography>
        <Typography color="textSecondary">
          Every transaction moves money in or out of one of your accounts: a bank account, a credit card or the cash in
          your wallet. Start with the one you use the most, you can add the others later.
        </Typography>
        <AccountForm onSubmit={onSubmit} submitText="Continue" />
      </Stack>
    </Box>
  )
}

export default FirstAccountSetup
