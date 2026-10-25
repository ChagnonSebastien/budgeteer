import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'

import { UpdatePreferencesContext, UserContext } from '../../App'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import AppDialog from '../shared/AppDialog'
import { SecureButton } from '../shared/SecureButton'

const unlockedFeatures = [
  'Accounts for your bank accounts, credit cards, cash and investments, with their balances',
  'Every transaction you make, recorded by hand or imported from your bank',
  'Dashboard, net worth, costs, trends and investment performance',
  'Expenses you paid in your groups recorded in your own accounts',
]

interface Props {
  open: boolean
  onClose(): void
}

const UnlockAllFeaturesDialog: FC<Props> = ({ open, onClose }) => {
  const { email } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const [error, setError] = useState('')

  const setupSteps = [
    'Pick your main currency: totals, charts and balances are shown in it.',
    'Add your first account, like the bank account you use the most.',
    'Choose your categories, from a common list or your own.',
    ...(transactionGroups.some((g) => g.hasJoined(email))
      ? ['Open each of your groups to pick the currency and category you track it in.']
      : []),
  ]

  const unlock = async () => {
    setError('')
    try {
      await updatePreferences({ sharedExpensesOnly: false })
    } catch {
      setError('Could not unlock all features. Please try again.')
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={onClose}
      title="Unlock all features"
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <SecureButton variant="contained" disableElevation onClick={unlock}>
            Unlock all features
          </SecureButton>
        </>
      }
    >
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        <Box>
          <Typography fontWeight="600">What you get</Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            {unlockedFeatures.map((feature) => (
              <Typography component="li" key={feature} color="textSecondary">
                {feature}
              </Typography>
            ))}
          </Box>
        </Box>
        <Box>
          <Typography fontWeight="600">First steps</Typography>
          <Box component="ol" sx={{ m: 0, pl: 3 }}>
            {setupSteps.map((step) => (
              <Typography component="li" key={step} color="textSecondary">
                {step}
              </Typography>
            ))}
          </Box>
        </Box>
        <Typography variant="body2" color="textDisabled">
          Your groups, expenses and settlements stay as they are.
        </Typography>
      </Stack>
    </AppDialog>
  )
}

export default UnlockAllFeaturesDialog
