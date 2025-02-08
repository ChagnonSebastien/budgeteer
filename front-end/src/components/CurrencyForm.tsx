import { Button, Dialog, FormControl, InputLabel, MenuItem, Select, Snackbar, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { DateCalendar, DateField, DateView } from '@mui/x-date-pickers'
import { startOfDay } from 'date-fns'
import dayjs, { Dayjs } from 'dayjs'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Currency, { CompositionType, ComponentRatio, ExchangeRate } from '../domain/model/currency'
import { CurrencyServiceContext } from '../service/ServiceContext'

const validAmount = new RegExp(`^\\d+[.,]?$`)
const validRate = new RegExp(`^\\d*[.,]?\\d*$`)

interface Props {
  initialCurrency?: Currency
  onSubmit: (data: Partial<Omit<Currency, 'id'>>) => Promise<void>
  submitText: string
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = ''

const CurrencyForm: FC<Props> = (props) => {
  const { initialCurrency, onSubmit, submitText } = props

  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)

  const [name, setName] = useState(initialCurrency?.name ?? '')
  const [symbol, setSymbol] = useState(initialCurrency?.symbol ?? '')
  const [type, setType] = useState(initialCurrency?.type ?? 'Liquid')
  const [decimalPoints, setDecimalPoints] = useState(
    `${typeof initialCurrency === 'undefined' ? '2' : initialCurrency.decimalPoints}`,
  )
  const [initialExchangeRate, setInitialExchangeRate] = useState('1')
  const [initialExchangeRateDate, setInitialExchangeRateDate] = useState(startOfDay(new Date()))
  const [dateView, setDateView] = useState<DateView>('day')
  const [currentTab, setCurrentTab] = useState<CompositionType>(CompositionType.Asset)
  const [compositions, setCompositions] = useState<{
    [key in CompositionType]: { [name: string]: ComponentRatio };
  }>({
    [CompositionType.Asset]: {},
    [CompositionType.Region]: {},
    [CompositionType.Sector]: {}
  })

  const [showDateModal, setShowDateModal] = useState(false)

  const showExchangeRate = useMemo(() => {
    return typeof initialCurrency === 'undefined' && defaultCurrency !== null
  }, [currencies])

  const [showErrorToast, setShowErrorToast] = useState('')
  const [errors, setErrors] = useState<{
    accountName: FieldStatus
    symbol: FieldStatus
    decimalPoints: FieldStatus
    exchangeRate: FieldStatus
    type: FieldStatus
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
    type: {
      hasVisited: false,
      isValid: true,
      errorText: NoError,
    }
  })

  const formatExample = useMemo(() => {
    let shift = 0
    try {
      shift = parseInt(decimalPoints)
    } catch (_error) {
      /* empty */
    }

    if (shift > 100) {
      shift = 100
    }

    return `${(Math.floor(123.456789 * Math.pow(10, shift)) / Math.pow(10, shift)).toFixed(shift)}`
  }, [decimalPoints])

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (Object.values(errors).some((value) => !value.isValid)) {
      setErrors((prevState) => ({
        accountName: {
          ...prevState.accountName,
          hasVisited: true,
        },
        symbol: {
          ...prevState.symbol,
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
        type: {
          ...prevState.type,
          hasVisited: true,
        }
      }))
      return
    }

    const today = new Date()
    const initialComposition = type !== 'Liquid' ? {
      date: today,
      compositions: compositions
    } : undefined

    onSubmit({
      name,
      decimalPoints: parseInt(decimalPoints),
      symbol: symbol,
      type: type,
      compositions: initialComposition ? [initialComposition] : [],
      exchangeRates: showExchangeRate
        ? {
            [defaultCurrency!.id]: [new ExchangeRate(0, parseFloat(initialExchangeRate), initialExchangeRateDate)],
          }
        : {},
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting the currency')
      console.error(err)
    })
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div style={{ display: 'flex' }}>
        <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>Form</div>
        <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
      </div>
      <Stack spacing="1rem" style={{ padding: '2rem 1rem', border: '1px grey solid', borderTop: 0 }}>
        <TextField
          type="text"
          label="Currency name"
          variant="standard"
          placeholder="e.g., Canadian dollars"
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

        <FormControl variant="standard" fullWidth>
          <InputLabel>Type</InputLabel>
          <Select
            value={type}
            onChange={(e) => setType(e.target.value)}
            label="Type"
          >
            <MenuItem value="Liquid">Liquid</MenuItem>
            <MenuItem value="ETF">ETF</MenuItem>
            <MenuItem value="Stock">Stock</MenuItem>
            <MenuItem value="Fund">Fund</MenuItem>
            <MenuItem value="Fixed_Revenue">Fixed Revenue</MenuItem>
          </Select>
        </FormControl>

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

            <div
              style={{
                transformOrigin: 'left center',
                transform: 'scale(0.75)',
                maxWidth: 'calc(100% / 0.75)',
              }}
            >
              <Typography color="warning">Warning: This value cannot be changed later</Typography>
            </div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex' }}>
            <Typography
              color="textSecondary"
              style={{ margin: '0 1rem', transform: 'translate(0, 0.5rem)', fontSize: '.75rem' }}
            >
              Formatting example
            </Typography>
            <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
          </div>
          <Typography style={{ padding: '1rem', border: '1px grey solid', borderTop: 0, textAlign: 'center' }}>
            {formatExample} {symbol}
          </Typography>
        </div>

        {showExchangeRate && (
          <div>
            <div style={{ height: '1rem' }} />
            <div style={{ color: 'grey' }}>Exchange Rates</div>
            <div style={{ display: 'flex', alignItems: 'end' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {`1 ${symbol === '' ? '___' : symbol}`}
              </div>
              <div style={{ margin: '0 1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>=</div>
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
              <div style={{ margin: '0 1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {defaultCurrency!.symbol} on
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  borderBottom: '1px rgba(0, 0, 0, 0.13) solid',
                }}
              >
                <DateField
                  value={dayjs(initialExchangeRateDate)}
                  onFocus={(ev) => {
                    setShowDateModal(true)
                    ev.preventDefault()
                    ev.target.blur()
                  }}
                  tabIndex={-1}
                  variant="standard"
                  sx={{ width: '100%' }}
                />

                <Dialog open={showDateModal} onClose={() => setShowDateModal(false)}>
                  <DateCalendar
                    views={['year', 'month', 'day']}
                    value={dayjs(initialExchangeRateDate)}
                    onChange={(newDate: Dayjs) => {
                      setInitialExchangeRateDate(newDate.toDate())
                      if (dateView === 'day') setShowDateModal(false)
                    }}
                    onViewChange={(view) => {
                      setDateView(view)
                    }}
                  />
                </Dialog>
              </div>
            </div>
          </div>
        )}
      </Stack>

      {type !== 'Liquid' && (
        <>
          <div style={{ height: '1rem' }} />
          <div style={{ border: '1px grey solid' }}>
            <Tabs value={currentTab} onChange={(_, newTab) => setCurrentTab(newTab)}>
              <Tab label="Asset Types" value={CompositionType.Asset} />
              <Tab label="Regions" value={CompositionType.Region} />
              <Tab label="Sectors" value={CompositionType.Sector} />
            </Tabs>
            <div style={{ padding: '1rem' }}>
              {currentTab === CompositionType.Asset && (
                <Stack spacing={2}>
                  <TextField
                    label="Other"
                    type="number"
                    value={compositions[CompositionType.Asset]['Other']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Asset]: {
                        ...prev[CompositionType.Asset],
                        'Other': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Liquid"
                    type="number"
                    value={compositions[CompositionType.Asset]['Liquid']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Asset]: {
                        ...prev[CompositionType.Asset],
                        'Liquid': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Stock"
                    type="number"
                    value={compositions[CompositionType.Asset]['Stock']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Asset]: {
                        ...prev[CompositionType.Asset],
                        'Stock': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Fixed Revenue"
                    type="number"
                    value={compositions[CompositionType.Asset]['Fixed_Revenue']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Asset]: {
                        ...prev[CompositionType.Asset],
                        'Fixed_Revenue': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                </Stack>
              )}
              {currentTab === CompositionType.Region && (
                <Stack spacing={2}>
                  <TextField
                    label="Canada"
                    type="number"
                    value={compositions[CompositionType.Region]['Canada']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Region]: {
                        ...prev[CompositionType.Region],
                        'Canada': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="USA"
                    type="number"
                    value={compositions[CompositionType.Region]['USA']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Region]: {
                        ...prev[CompositionType.Region],
                        'USA': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Developed Markets"
                    type="number"
                    value={compositions[CompositionType.Region]['Developed_Markets']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Region]: {
                        ...prev[CompositionType.Region],
                        'Developed_Markets': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Developing Markets"
                    type="number"
                    value={compositions[CompositionType.Region]['Developing_Markets']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Region]: {
                        ...prev[CompositionType.Region],
                        'Developing_Markets': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                </Stack>
              )}
              {currentTab === CompositionType.Sector && (
                <Stack spacing={2}>
                  <TextField
                    label="Energy"
                    type="number"
                    value={compositions[CompositionType.Sector]['Energy']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Sector]: {
                        ...prev[CompositionType.Sector],
                        'Energy': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Financial"
                    type="number"
                    value={compositions[CompositionType.Sector]['Financial']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Sector]: {
                        ...prev[CompositionType.Sector],
                        'Financial': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Technology"
                    type="number"
                    value={compositions[CompositionType.Sector]['Technology']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Sector]: {
                        ...prev[CompositionType.Sector],
                        'Technology': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                  <TextField
                    label="Other"
                    type="number"
                    value={compositions[CompositionType.Sector]['Other']?.ratio ?? 0}
                    onChange={(e) => setCompositions(prev => ({
                      ...prev,
                      [CompositionType.Sector]: {
                        ...prev[CompositionType.Sector],
                        'Other': { ratio: parseFloat(e.target.value) }
                      }
                    }))}
                  />
                </Stack>
              )}
            </div>
          </div>
        </>
      )}

      <div style={{ height: '1rem' }} />

      <Button type="submit" fullWidth variant="contained">
        {submitText}
      </Button>

      <Snackbar
        open={showErrorToast !== ''}
        message={showErrorToast}
        autoHideDuration={5000}
        onClose={() => setShowErrorToast('')}
      />
    </form>
  )
}

export default CurrencyForm
