import { Alert, Box, Stack, Typography } from '@mui/material'
import { FC, useState } from 'react'

import IsoCurrencyPicker, { CurrencyChoice, defaultCurrencyCode, useCurrencyChoices } from './IsoCurrencyPicker'
import FormWrapper from '../shared/FormWrapper'

const WelcomeCurrencySetup: FC<{ onSubmit(choice: CurrencyChoice): Promise<void> }> = ({ onSubmit }) => {
  const choices = useCurrencyChoices()
  const [choice, setChoice] = useState<CurrencyChoice | null>(
    () => choices.find((c) => c.code === defaultCurrencyCode) ?? null,
  )
  const [error, setError] = useState('')

  const submit = async () => {
    if (choice === null) return
    setError('')
    try {
      await onSubmit(choice)
    } catch {
      setError('Could not save your currency. Please try again.')
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', display: 'flex' }}>
      <Stack spacing={2} sx={{ p: 2, maxWidth: (t) => t.contentWidth.default, width: '100%', m: 'auto' }}>
        <Typography variant="h5">Welcome to Fintrospect</Typography>
        <Typography color="textSecondary">
          Track your accounts and spending, and split expenses with others. To start, pick the currency you use day to
          day: totals, charts and balances are shown in it.
        </Typography>
        <FormWrapper onSubmit={submit} submitText="Continue">
          {error && <Alert severity="error">{error}</Alert>}
          <IsoCurrencyPicker choices={choices} value={choice} onChange={setChoice} label="Main currency" />
          <Typography variant="caption" color="textDisabled">
            Your main currency can't be changed later. You can add other currencies, stocks or funds at any time.
          </Typography>
        </FormWrapper>
      </Stack>
    </Box>
  )
}

export default WelcomeCurrencySetup
