import { Autocomplete, Box, createFilterOptions, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { startOfDay } from 'date-fns'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'

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

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = ''

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
  const [errors, setErrors] = useState<{
    accountName: FieldStatus
    symbol: FieldStatus
    risk: FieldStatus
    decimalPoints: FieldStatus
    exchangeRate: FieldStatus
  }>({
    accountName: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    symbol: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    risk: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    decimalPoints: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    exchangeRate: {
      hasVisited: false,
      isValid: !showExchangeRate,
      errorText: NoError,
    },
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

  const validateAccountName = useCallback(
    (newName: string) => {
      if (!newName) {
        return 'Required'
      }

      if (currencies?.find((a) => a.id !== initialCurrency?.id && a.name === newName)) {
        return 'Name is already being used'
      }

      return NoError
    },
    [currencies],
  )

  const validateSymbol = useCallback(
    (newName: string) => {
      if (!newName) {
        return 'Required'
      }

      return NoError
    },
    [currencies],
  )

  const validateDecimalPoints = useCallback((newName: string) => {
    if (!newName) {
      return 'Required'
    }

    if (!validAmount.test(newName)) {
      return 'Must be a integer value'
    }

    return NoError
  }, [])

  const validateExchangeRate = useCallback((newName: string) => {
    if (!newName) {
      return 'Required'
    }

    if (!validRate.test(newName)) {
      return 'Must be a valid rate'
    }

    if (parseFloat(newName) === 0) {
      return 'Rate must be above 0'
    }

    return NoError
  }, [])

  useEffect(() => {
    const accountNameError = validateAccountName(name)
    setErrors((prevState) => ({
      ...prevState,
      accountName: {
        ...prevState.accountName,
        errorText: accountNameError,
        isValid: accountNameError == NoError,
      },
    }))
  }, [validateAccountName, name])

  useEffect(() => {
    const symbolError = validateSymbol(symbol)
    setErrors((prevState) => ({
      ...prevState,
      symbol: {
        ...prevState.symbol,
        errorText: symbolError,
        isValid: symbolError == NoError,
      },
    }))
  }, [validateSymbol, symbol])

  useEffect(() => {
    const riskError = isCurrencyRisk(risk) ? NoError : 'Required'
    setErrors((prevState) => ({
      ...prevState,
      risk: {
        ...prevState.risk,
        errorText: riskError,
        isValid: riskError == NoError,
      },
    }))
  }, [risk])

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

  useEffect(() => {
    const decimalPointsError = validateDecimalPoints(decimalPoints)
    setErrors((prevState) => ({
      ...prevState,
      decimalPoints: {
        ...prevState.decimalPoints,
        errorText: decimalPointsError,
        isValid: decimalPointsError == NoError,
      },
    }))
  }, [validateDecimalPoints, decimalPoints])

  useEffect(() => {
    const exchangeRateError = validateExchangeRate(initialExchangeRate)
    setErrors((prevState) => ({
      ...prevState,
      exchangeRate: {
        ...prevState.exchangeRate,
        errorText: exchangeRateError,
        isValid: exchangeRateError == NoError,
      },
    }))
  }, [validateExchangeRate, initialExchangeRate])

  const isFormValid = useMemo(() => {
    return Object.values(errors).every((value) => value.isValid)
  }, [errors])

  const handleSubmit = (_: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      setErrors((prevState) => ({
        accountName: {
          ...prevState.accountName,
          hasVisited: true,
        },
        symbol: {
          ...prevState.symbol,
          hasVisited: true,
        },
        risk: {
          ...prevState.risk,
          hasVisited: true,
        },
        decimalPoints: {
          ...prevState.decimalPoints,
          hasVisited: true,
        },
        exchangeRate: {
          ...prevState.exchangeRate,
          hasVisited: true,
        },
      }))
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
        helperText={errors.accountName.hasVisited ? errors.accountName.errorText : ''}
        error={errors.accountName.hasVisited && !!errors.accountName.errorText}
        sx={{ width: '100%' }}
        onBlur={() =>
          setErrors((prevState) => ({
            ...prevState,
            accountName: {
              ...prevState.accountName,
              hasVisited: true,
            },
          }))
        }
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
          errors.risk.hasVisited && errors.risk.errorText
            ? errors.risk.errorText
            : initialRisk !== '' && !isCurrencyRisk(initialRisk) && risk === ''
              ? `"${initialRisk}" is not on the risk scale, pick one`
              : NoError
        }
        error={errors.risk.hasVisited && !!errors.risk.errorText}
        onBlur={() =>
          setErrors((prevState) => ({
            ...prevState,
            risk: {
              ...prevState.risk,
              hasVisited: true,
            },
          }))
        }
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
        helperText={errors.symbol.hasVisited ? errors.symbol.errorText : ''}
        error={errors.symbol.hasVisited && !!errors.symbol.errorText}
        onBlur={() =>
          setErrors((prevState) => ({
            ...prevState,
            symbol: {
              ...prevState.symbol,
              hasVisited: true,
            },
          }))
        }
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
            helperText={errors.decimalPoints.hasVisited ? errors.decimalPoints.errorText : ''}
            error={errors.decimalPoints.hasVisited && !!errors.decimalPoints.errorText}
            onBlur={() =>
              setErrors((prevState) => ({
                ...prevState,
                decimalPoints: {
                  ...prevState.decimalPoints,
                  hasVisited: true,
                },
              }))
            }
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
                error={errors.exchangeRate.hasVisited && !!errors.exchangeRate.errorText}
                sx={{ width: '100%' }}
                onBlur={() =>
                  setErrors((prevState) => ({
                    ...prevState,
                    exchangeRate: {
                      ...prevState.exchangeRate,
                      hasVisited: true,
                    },
                  }))
                }
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
