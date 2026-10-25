import { Alert, Box, Paper, Stack, Typography } from '@mui/material'
import { FC, useContext, useState } from 'react'

import { UpdatePreferencesContext, UserContext } from '../../App'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { SecureButton } from '../shared/SecureButton'

interface Option {
  sharedExpensesOnly: boolean
  title: string
  recommendation: string
  description: string
  action: string
}

const options: Option[] = [
  {
    sharedExpensesOnly: true,
    title: 'Shared expenses only',
    recommendation: 'Recommended if you were invited to a group',
    description:
      'Add what you paid, see who owes what and settle up with your groups. Nothing else to set up. You can unlock everything else later.',
    action: 'Use for shared expenses',
  },
  {
    sharedExpensesOnly: false,
    title: 'Full financial tracking',
    recommendation: 'Recommended if you want to track your own finances',
    description:
      'Track your accounts, spending, net worth and investments, and split expenses with others. Takes a few minutes to set up.',
    action: 'Set up full tracking',
  },
]

const UsageChoice: FC = () => {
  const { email } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const [error, setError] = useState('')

  const invitation = transactionGroups.find((g) => !g.hasJoined(email))
  const recommended = invitation !== undefined

  const choose = async (sharedExpensesOnly: boolean) => {
    setError('')
    try {
      await updatePreferences({ sharedExpensesOnly })
    } catch {
      setError('Could not save your choice. Please try again.')
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', display: 'flex' }}>
      <Stack spacing={2} sx={{ p: 2, maxWidth: (t) => t.contentWidth.default, width: '100%', m: 'auto' }}>
        <Typography variant="h5">Welcome to Fintrospect</Typography>
        <Typography color="textSecondary">
          {invitation
            ? `You were invited to ${invitation.name}. How do you want to use Fintrospect?`
            : 'How do you want to use Fintrospect?'}
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {options.map((option) => {
          const highlighted = option.sharedExpensesOnly === recommended
          return (
            <Paper
              key={option.title}
              variant="outlined"
              sx={(t) => ({
                p: 2,
                borderRadius: t.radius.card,
                borderColor: highlighted ? 'primary.main' : 'border.subtle',
              })}
            >
              <Stack spacing={1.5} sx={{ alignItems: 'start' }}>
                <Box>
                  <Typography variant="h6">{option.title}</Typography>
                  <Typography variant="subtitle2" color="warning.main">
                    {option.recommendation}
                  </Typography>
                </Box>
                <Typography color="textSecondary">{option.description}</Typography>
                <SecureButton
                  variant={highlighted ? 'contained' : 'outlined'}
                  disableElevation
                  onClick={() => choose(option.sharedExpensesOnly)}
                >
                  {option.action}
                </SecureButton>
              </Stack>
            </Paper>
          )
        })}
      </Stack>
    </Box>
  )
}

export default UsageChoice
