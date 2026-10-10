import { Alert, Autocomplete, Box, Stack, TextField, Typography } from '@mui/material'
import { FC, useMemo, useState } from 'react'

import FormWrapper from '../shared/FormWrapper'

const defaultCurrencyCode = 'CAD'

export interface CurrencyChoice {
  code: string
  name: string
  decimalPoints: number
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

const toChoice = (code: string): CurrencyChoice => ({
  code,
  name: currencyNames.of(code) ?? code,
  decimalPoints: new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
    .maximumFractionDigits!,
})

const WelcomeCurrencySetup: FC<{ onSubmit(choice: CurrencyChoice): Promise<void> }> = ({ onSubmit }) => {
  const choices = useMemo(() => Intl.supportedValuesOf('currency').map(toChoice), [])
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
        <Typography variant="h5">Welcome to Budgeteer</Typography>
        <Typography color="textSecondary">
          Track your accounts and spending, and split expenses with others. To start, pick the currency you use day to
          day: totals, charts and balances are shown in it.
        </Typography>
        <FormWrapper onSubmit={submit} submitText="Continue">
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={choices}
            value={choice}
            onChange={(_, value) => setChoice(value)}
            getOptionLabel={(option) => `${option.name} (${option.code})`}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            renderInput={(params) => <TextField {...params} label="Main currency" />}
          />
          <Typography variant="caption" color="textDisabled">
            Your main currency can't be changed later. You can add other currencies, stocks or funds at any time.
          </Typography>
        </FormWrapper>
      </Stack>
    </Box>
  )
}

export default WelcomeCurrencySetup
