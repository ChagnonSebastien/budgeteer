import { Box, Button, Checkbox, FormControlLabel, TextField, Typography } from '@mui/material'
import { startOfDay } from 'date-fns'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../domain/model/currency'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import ExchangeRateHistory from '../graphing/ExchangeRateHistory'
import CodeEditor from '../inputs/CodeEditor'
import DatePicker from '../inputs/DatePicker'
import FormWrapper from '../shared/FormWrapper'
import { Row } from '../shared/Layout'

const validAmount = new RegExp(`^\\d+[.,]?$`)
const validRate = new RegExp(`^\\d*[.,]?\\d*$`)

export interface ExchangeRateConfig {
  otherCurrency: number
  date: Date
  rate: number
}

interface Props {
  initialCurrency?: Currency
  onSubmit: (
    currencyData: Partial<CurrencyUpdatableFields>,
    initialExchangeRates?: ExchangeRateConfig[],
  ) => Promise<void>
  submitText: string
  scriptRunner: (script: string) => Promise<string>
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = ''

const defaultScript = `// Update the code to fetch the exchange rate.
// Code block should end with a async function call that returns a number value.

// This code runs in a bare-bones V8 engine. It implements the ECMAScript language spec itself, but it doesn’t include
// any of the host-environment APIs you get in Node.js or a browser. This is for sandboxing reasons because one should
// never run untrusted code that could arbitrarily read files, make HTTP calls, spin up timers, etc. Some methods have
// been explicitly setup for your convenience within the sandbox:

// - httpGet(string url) string
//     Gets the body response of a http get request to the specified url 
// - httpGetWithStealth(string url) string
//     Gets the body response of a http get request to the specified url that is behind a Cloudflare bot protection

async function getRate() {
  return 1
}

getRate()
`

const CurrencyForm: FC<Props> = (props) => {
  const { initialCurrency, onSubmit, submitText, scriptRunner } = props

  const { state: currencies, tentativeDefaultCurrency } = useContext(CurrencyServiceContext)

  const [name, setName] = useState(initialCurrency?.name ?? '')
  const [symbol, setSymbol] = useState(initialCurrency?.symbol ?? '')
  const [risk, setRisk] = useState(initialCurrency?.risk ?? '')
  const [type, setType] = useState(initialCurrency?.type ?? '')
  const [decimalPoints, setDecimalPoints] = useState(
    `${typeof initialCurrency === 'undefined' ? '2' : initialCurrency.decimalPoints}`,
  )
  const [initialExchangeRate, setInitialExchangeRate] = useState('1')
  const [initialExchangeRateDate, setInitialExchangeRateDate] = useState(startOfDay(new Date()))
  const [getRateScript, setGetRateScript] = useState<string>(
    (initialCurrency?.rateAutoupdateSettings.script ?? '') === ''
      ? defaultScript
      : initialCurrency!.rateAutoupdateSettings.script,
  )

  const [scriptOutput, setScriptOutput] = useState<number | null>(null)
  const setRateAutoupdateScript = useCallback((value?: string) => {
    setScriptOutput(null)
    setGetRateScript(value!)
  }, [])
  const [rateAutoupdateEnabled, setRateAutoupdateEnabled] = useState<boolean>(
    initialCurrency?.rateAutoupdateSettings.enabled ?? false,
  )
  const [rateScriptError, setRateScriptError] = useState<string | null>(null)

  const showExchangeRate = useMemo(() => {
    return typeof initialCurrency === 'undefined' && tentativeDefaultCurrency !== null
  }, [initialCurrency, tentativeDefaultCurrency])

  const [showErrorToast, setShowErrorToast] = useState('')
  const [errors, setErrors] = useState<{
    accountName: FieldStatus
    symbol: FieldStatus
    decimalPoints: FieldStatus
    exchangeRate: FieldStatus
    autoupdateScriptValidated: FieldStatus
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
    autoupdateScriptValidated: {
      hasVisited: false,
      isValid: false,
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

  useEffect(() => {
    let rateAutoupdateError = NoError
    if (rateAutoupdateEnabled) {
      if (getRateScript === defaultScript) {
        rateAutoupdateError =
          'You must edit the script before enabling autoupdates. Otherwise, this currency will be pinned to the the default currency'
      } else if (initialCurrency?.rateAutoupdateSettings.script !== getRateScript) {
        if (rateScriptError !== null || scriptOutput === null) {
          rateAutoupdateError =
            'You must have one successfully run with the script before you can save it with autoupdate enabled.'
        }
      }
    }
    setErrors((prevState) => ({
      ...prevState,
      autoupdateScriptValidated: {
        ...prevState.autoupdateScriptValidated,
        errorText: rateAutoupdateError,
        isValid: rateAutoupdateError == NoError,
      },
    }))
  }, [
    rateScriptError,
    scriptOutput,
    initialCurrency?.rateAutoupdateSettings.script,
    getRateScript,
    rateAutoupdateEnabled,
  ])

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
        decimalPoints: {
          ...prevState.decimalPoints,
          hasVisited: true,
        },
        exchangeRate: {
          ...prevState.exchangeRate,
          hasVisited: true,
        },
        autoupdateScriptValidated: {
          ...prevState.autoupdateScriptValidated,
          hasVisited: true,
        },
      }))
      return
    }

    onSubmit(
      {
        name,
        decimalPoints: parseInt(decimalPoints),
        type: type.trim(),
        risk: risk.trim(),
        symbol: symbol,
        rateAutoupdateSettings: new RateAutoupdateSettings(getRateScript, rateAutoupdateEnabled),
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
      setShowErrorToast('Unexpected error while submitting the currency')
      console.error(err)
    })
  }

  const testScript = async () => {
    const runnerResponse = await scriptRunner(getRateScript!)
    const rate = Number.parseFloat(runnerResponse.replaceAll(',', '.'))
    if (isNaN(rate)) {
      setRateScriptError(`Invalid format or an error occurred: ${runnerResponse}`)
      return
    }

    setRateScriptError(null)
    setScriptOutput(rate)
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} errorMessage={showErrorToast}>
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
        label="Type"
        variant="standard"
        placeholder="e.g., Mutual Fund"
        value={type}
        helperText={NoError}
        onChange={(ev) => setType(ev.target.value as string)}
      />

      <TextField
        type="text"
        label="Risk"
        variant="standard"
        placeholder="e.g., High"
        value={risk}
        helperText={NoError}
        onChange={(ev) => setRisk(ev.target.value as string)}
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

      {showExchangeRate && (
        <>
          <div>
            <Row>
              <Typography
                color="textSecondary"
                style={{ margin: '0 1rem', transform: 'translate(0, 0.5rem)', fontSize: '.75rem' }}
              >
                Formatting example
              </Typography>
              <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
            </Row>
            <Typography style={{ padding: '1rem', border: '1px grey solid', borderTop: 0, textAlign: 'center' }}>
              {formatExample(123.456789)} {symbol}
            </Typography>
          </div>
          <div>
            <div style={{ height: '1rem' }} />
            <div style={{ color: 'grey' }}>Exchange Rates</div>
            <Row style={{ alignItems: 'end' }}>
              <Row style={{ alignItems: 'center', flexShrink: 0 }}>{`1 ${symbol === '' ? '___' : symbol}`}</Row>
              <Row style={{ margin: '0 1rem', alignItems: 'center', flexShrink: 0 }}>=</Row>
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
              <Row style={{ margin: '0 1rem', alignItems: 'center', flexShrink: 0 }}>
                {tentativeDefaultCurrency!.symbol} on
              </Row>
              <DatePicker date={initialExchangeRateDate} onChange={setInitialExchangeRateDate} label="" />
            </Row>
          </div>
        </>
      )}
      {tentativeDefaultCurrency?.id !== initialCurrency?.id && initialCurrency && tentativeDefaultCurrency && (
        <>
          <Typography
            variant="subtitle2"
            style={{
              opacity: 0.6,
              marginBottom: '16px',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            EXCHANGE RATE HISTORY
          </Typography>
          <Box style={{ height: '200px', display: 'flex', justifyContent: 'stretch', alignItems: 'stretch' }}>
            <ExchangeRateHistory currency={initialCurrency} against={tentativeDefaultCurrency} />
          </Box>
        </>
      )}
      {tentativeDefaultCurrency?.id !== initialCurrency?.id && (
        <>
          <Typography
            variant="subtitle2"
            style={{
              opacity: 0.6,
              marginBottom: '16px',
              letterSpacing: '0.05em',
              fontSize: '0.75rem',
            }}
          >
            EXCHANGE RATE FETCHER
          </Typography>
          <CodeEditor content={getRateScript} onChange={setRateAutoupdateScript} />
          <div>
            <Row>
              <Typography
                color="textSecondary"
                style={{ margin: '0 1rem', transform: 'translate(0, 0.5rem)', fontSize: '.75rem' }}
              >
                Test and Submit
              </Typography>
              <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
            </Row>
            <Row
              style={{
                padding: '1rem',
                border: '1px grey solid',
                borderTop: 0,
                textAlign: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Button variant="contained" onClick={testScript}>
                Test Run
              </Button>
              <Typography color={rateScriptError === null ? 'success' : 'error'}>
                {rateScriptError === null && scriptOutput !== null && (
                  <>
                    1 {symbol} = {scriptOutput} {tentativeDefaultCurrency?.symbol ?? '$'}
                  </>
                )}
                {rateScriptError !== null && rateScriptError}
              </Typography>
              {initialCurrency && (
                <Button variant="contained" disabled={rateScriptError !== null || scriptOutput === null}>
                  Submit
                </Button>
              )}
            </Row>
          </div>

          <div>
            <Row>
              <Typography
                color="textSecondary"
                style={{ margin: '0 1rem', transform: 'translate(0, 0.5rem)', fontSize: '.75rem' }}
              >
                Rate Auto Update
              </Typography>
              <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
            </Row>
            <div>
              <Row
                style={{
                  padding: '1rem',
                  border: '1px grey solid',
                  borderTop: 0,
                  textAlign: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ margin: 'auto 2rem' }}>
                  {errors.autoupdateScriptValidated.hasVisited && !!errors.autoupdateScriptValidated.errorText ? (
                    <Typography color="error">{errors.autoupdateScriptValidated.errorText}</Typography>
                  ) : (
                    <Typography>
                      Do you want to enable the auto update of the rate? It will be fetched at 6AM every day for the day
                      before.
                    </Typography>
                  )}
                </div>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rateAutoupdateEnabled}
                      onChange={(ev) => setRateAutoupdateEnabled(ev.target.checked)}
                    />
                  }
                  label="Enabled"
                />
              </Row>
            </div>
          </div>
        </>
      )}
    </FormWrapper>
  )
}

export default CurrencyForm
