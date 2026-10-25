import { Autocomplete, TextField } from '@mui/material'
import { FC, useMemo } from 'react'

import { searchFilterOptions } from '../../utils'

export const defaultCurrencyCode = 'CAD'

export interface CurrencyChoice {
  code: string
  name: string
  decimalPoints: number
}

const currencyNames = new Intl.DisplayNames(['en'], { type: 'currency' })

export const toCurrencyChoice = (code: string): CurrencyChoice => ({
  code,
  name: currencyNames.of(code) ?? code,
  decimalPoints: new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
    .maximumFractionDigits!,
})

export const useCurrencyChoices = () => useMemo(() => Intl.supportedValuesOf('currency').map(toCurrencyChoice), [])

interface Props {
  choices: CurrencyChoice[]
  value: CurrencyChoice | null
  onChange(choice: CurrencyChoice | null): void
  label: string
}

const IsoCurrencyPicker: FC<Props> = ({ choices, value, onChange, label }) => (
  <Autocomplete
    filterOptions={searchFilterOptions}
    options={choices}
    value={value}
    onChange={(_, choice) => onChange(choice)}
    getOptionLabel={(option) => `${option.name} (${option.code})`}
    isOptionEqualToValue={(a, b) => a.code === b.code}
    renderInput={(params) => <TextField {...params} label={label} />}
  />
)

export default IsoCurrencyPicker
