import { Autocomplete, Box, createFilterOptions, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { startOfDay } from 'date-fns'
import { FC, FormEvent, useCallback, useContext, useMemo, useState } from 'react'

import { validRate } from './exchangeRateUnits'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../domain/model/currency'
import {
  currencyRisks,
  CurrencyTypeOption,
  currencyTypeOptions,
  isCurrencyRisk,
  rateWording,
  suggestedRiskForType,
} from '../../domain/model/currencyClassification'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import DatePicker from '../inputs/DatePicker'
import FormWrapper, { FormSection } from '../shared/FormWrapper'
import { useToast } from '../shared/ToastProvider'

const validAmount = new RegExp(`^\\d+[.,]?$`)

export interface ExchangeRateConfig {
  otherCurrency: number
  date: Date
  rate: number
}

interface Props {
  initialCurrency?: Currency
  initialName?: string
  onSubmit: (
    currencyData: Partial<CurrencyUpdatableFields>,
    initialExchangeRates?: ExchangeRateConfig[],
  ) => Promise<void>
  submitText: string
}

type Field = 'accountName' | 'symbol' | 'risk' | 'decimalPoints' | 'exchangeRate'

const NoError = ''

const validateDecimalPoints = (value: string) => {
  if (!value) {
    return 'Required'
  }

  if (!validAmount.test(value)) {
    return 'Must be a integer value'
  }

  return NoError
}

const validateExchangeRate = (value: string) => {
  if (!value) {
    return 'Required'
  }

  if (!validRate.test(value)) {
    return 'Must be a valid rate'
  }

  if (parseFloat(value) === 0) {
    return 'Rate must be above 0'
  }

  return NoError
}

const filterTypeOptions = createFilterOptions<CurrencyTypeOption>({ stringify: (o) => `${o.name} ${o.group}` })

const CurrencyForm: FC<Props> = (props) => {
  const { initialCurrency, initialName, onSubmit, submitText } = props

  const { state: currencies, tentativeDefaultCurrency } = useContext(CurrencyServiceContext)

  const [name, setName] = useState(initialCurrency?.name ?? initialName ?? '')
  const [symbol, setSymbol] = useState(initialCurrency?.symbol ?? '')
  const initialRisk = initialCurrency?.risk ?? ''
  const [risk, setRisk] = useState(isCurrencyRisk(initialRisk) ? initialRisk : '')
  const [autofilledRisk, setAutofilledRisk] = useState<string | null>(null)
  const [type, setType] = useState(initialCurrency?.type ?? '')
  const [decimalPoints, setDecimalPoints] = useState(
    `${typeof initialCurrency === 'undefined' ? '2' : initialCurrency.decimalPoints}`,
  )
  const [initialExchangeRate, setInitialExchangeRate] = useState('1')
  const [initialExchangeRateDate, setInitialExchangeRateDate] = useState(startOfDay(new Date()))

  const otherCurrencies = useMemo(
    () => currencies.filter((c) => c.id !== initialCurrency?.id),
    [currencies, initialCurrency],
  )

  const typeOptions = useMemo(() => currencyTypeOptions(otherCurrencies), [otherCurrencies])

  const showExchangeRate = useMemo(() => {
    return typeof initialCurrency === 'undefined' && tentativeDefaultCurrency !== null
  }, [initialCurrency, tentativeDefaultCurrency])

  const { showToast } = useToast()
  const [visited, setVisited] = useState<Record<Field, boolean>>({
    accountName: false,
    symbol: false,
    risk: false,
    decimalPoints: false,
    exchangeRate: false,
  })

  const formatExample = useCallback(
    (value: number) => {
      let shift = 0
      try {
        shift = parseInt(decimalPoints)
      } catch (_error) {
        /* empty */
      }

      if (shift > 100) {
        shift = 100
      }

      return `${(Math.floor(value * Math.pow(10, shift)) / Math.pow(10, shift)).toFixed(shift)}`
    },
    [decimalPoints],
  )

  const initialCurrencyId = initialCurrency?.id
  const accountNameError = useMemo(() => {
    if (!name) {
      return 'Required'
    }

    if (currencies?.find((a) => a.id !== initialCurrencyId && a.name === name)) {
      return 'Name is already being used'
    }

    return NoError
  }, [currencies, initialCurrencyId, name])

  const fieldErrors: Record<Field, string> = {
    accountName: accountNameError,
    symbol: symbol ? NoError : 'Required',
    risk: isCurrencyRisk(risk) ? NoError : 'Required',
    decimalPoints: validateDecimalPoints(decimalPoints),
    exchangeRate: validateExchangeRate(initialExchangeRate),
  }

  const changeType = (newType: string) => {
    if (newType === type) return
    setType(newType)

    if (risk !== '' && risk !== autofilledRisk) return
    const suggestion = suggestedRiskForType(newType, otherCurrencies)
    if (suggestion === null || suggestion === risk) return

    setRisk(suggestion)
    setAutofilledRisk(suggestion)
    showToast('Risk autofilled from type', 'info')
  }

  const isFormValid = Object.values(fieldErrors).every((error) => error === NoError)

  const handleSubmit = (_: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      setVisited({ accountName: true, symbol: true, risk: true, decimalPoints: true, exchangeRate: true })
      return
    }

    return onSubmit(
      {
        name,
        type: type.trim(),
        risk,
        symbol: symbol,
        ...(typeof initialCurrency === 'undefined' && {
          decimalPoints: parseInt(decimalPoints),
          rateAutoupdateSettings: new RateAutoupdateSettings('', false),
        }),
      },
      showExchangeRate && tentativeDefaultCurrency != null
        ? [
            {
              otherCurrency: tentativeDefaultCurrency.id,
              rate:
                parseFloat(initialExchangeRate.replaceAll(',', '.')) *
                Math.pow(10, tentativeDefaultCurrency.decimalPoints - parseInt(decimalPoints)),
              date: initialExchangeRateDate,
            },
          ]
        : undefined,
    ).catch((err) => {
      showToast('Unexpected error while submitting the asset', 'error')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      <TextField
        type="text"
        label="Name"
        variant="standard"
        placeholder="e.g., Canadian dollars, VFV"
        value={name}
        onChange={(ev) => setName(ev.target.value as string)}
        helperText={visited.accountName ? fieldErrors.accountName : ''}
        error={visited.accountName && !!fieldErrors.accountName}
        sx={{ width: '100%' }}
        onBlur={() => setVisited((prevState) => ({ ...prevState, accountName: true }))}
      />

      <Autocomplete
        freeSolo
        options={typeOptions}
        groupBy={(o) => o.group}
        getOptionLabel={(o) => (typeof o === 'string' ? o : o.name)}
        filterOptions={filterTypeOptions}
        inputValue={type}
        onInputChange={(_, value) => changeType(value)}
        renderOption={({ key, ...optionProps }, option) => {
          const suggestion = suggestedRiskForType(option.name, otherCurrencies)
          return (
            <Box component="li" key={key} {...optionProps}>
              <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ width: '100%' }}>
                <span>{option.name}</span>
                {suggestion !== null && (
                  <Typography variant="caption" color="text.secondary">
                    {suggestion}
                  </Typography>
                )}
              </Stack>
            </Box>
          )
        }}
        renderInput={(params) => (
          <TextField {...params} label="Type" variant="standard" placeholder="e.g., Equity ETF" />
        )}
      />

      <TextField
        select
        label="Risk"
        variant="standard"
        value={risk}
        onChange={(ev) => {
          setRisk(ev.target.value)
          setAutofilledRisk(null)
        }}
        helperText={
          visited.risk && fieldErrors.risk
            ? fieldErrors.risk
            : initialRisk !== '' && !isCurrencyRisk(initialRisk) && risk === ''
              ? `"${initialRisk}" is not on the risk scale, pick one`
              : NoError
        }
        error={visited.risk && !!fieldErrors.risk}
        onBlur={() => setVisited((prevState) => ({ ...prevState, risk: true }))}
      >
        {currencyRisks.map((r) => (
          <MenuItem key={r} value={r}>
            {r}
          </MenuItem>
        ))}
      </TextField>

      <TextField
        type="text"
        label="Symbol"
        variant="standard"
        placeholder="e.g., CAD"
        sx={{ width: '100%' }}
        value={symbol}
        onChange={(ev) => setSymbol(ev.target.value as string)}
        helperText={visited.symbol ? fieldErrors.symbol : ''}
        error={visited.symbol && !!fieldErrors.symbol}
        onBlur={() => setVisited((prevState) => ({ ...prevState, symbol: true }))}
      />

      {typeof initialCurrency === 'undefined' && (
        <div>
          <TextField
            type="text"
            label="Amount of decimal points"
            variant="standard"
            value={decimalPoints}
            sx={{ width: '100%' }}
            onChange={(ev) => setDecimalPoints(ev.target.value as string)}
            helperText={visited.decimalPoints ? fieldErrors.decimalPoints : ''}
            error={visited.decimalPoints && !!fieldErrors.decimalPoints}
            onBlur={() => setVisited((prevState) => ({ ...prevState, decimalPoints: true }))}
          />

          <Typography variant="caption" color="warning">
            Warning: This value cannot be changed later
          </Typography>
        </div>
      )}

      {showExchangeRate && (
        <>
          <FormSection title="Formatting example">
            <Typography textAlign="center">
              {formatExample(123.456789)} {symbol}
            </Typography>
          </FormSection>
          <FormSection title={rateWording(type).title}>
            <Stack direction="row" alignItems="flex-end" spacing={2}>
              <Box sx={{ flexShrink: 0 }}>{`1 ${symbol === '' ? '___' : symbol}`}</Box>
              <Box sx={{ flexShrink: 0 }}>=</Box>
              <TextField
                type="text"
                variant="standard"
                value={initialExchangeRate}
                onChange={(ev) => setInitialExchangeRate(ev.target.value as string)}
                error={visited.exchangeRate && !!fieldErrors.exchangeRate}
                sx={{ width: '100%' }}
                onBlur={() => setVisited((prevState) => ({ ...prevState, exchangeRate: true }))}
              />
              <Box sx={{ flexShrink: 0 }}>{tentativeDefaultCurrency!.symbol} on</Box>
              <DatePicker date={initialExchangeRateDate} onChange={setInitialExchangeRateDate} label="" />
            </Stack>
          </FormSection>
        </>
      )}
    </FormWrapper>
  )
}

export default CurrencyForm
