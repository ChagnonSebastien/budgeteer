import { Alert, Autocomplete, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { FC, FormEvent, useMemo, useState } from 'react'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (choice === null) return
    setSaving(true)
    setError('')
    try {
      await onSubmit(choice)
    } catch {
      setError('Could not save your currency. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', display: 'flex' }}>
      <Box component="form" onSubmit={submit} sx={{ p: 2, maxWidth: 440, width: '100%', m: 'auto' }}>
        <Stack spacing={2}>
          <Typography variant="h5">Welcome to Budgeteer</Typography>
          <Typography color="textSecondary">
            Track your accounts and spending, and split expenses with others. To start, pick the currency you use day to
            day: totals, charts and balances are shown in it.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Autocomplete
            options={choices}
            value={choice}
            onChange={(_, value) => setChoice(value)}
            getOptionLabel={(option) => `${option.name} (${option.code})`}
            isOptionEqualToValue={(a, b) => a.code === b.code}
            disabled={saving}
            renderInput={(params) => <TextField {...params} label="Main currency" />}
          />
          <Typography variant="caption" color="textDisabled">
            Your main currency can't be changed later. You can add other currencies, stocks or funds at any time.
          </Typography>
          <Button type="submit" variant="contained" disabled={saving || choice === null}>
            Continue
          </Button>
        </Stack>
      </Box>
    </Box>
  )
}

export default WelcomeCurrencySetup
