import { Alert, AlertTitle, Box, Button, Stack, Switch, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, useCallback, useContext, useState } from 'react'

import { formatRate } from './ExchangeRatePoints'
import { hasRateFetchFailure } from './useRateFetchFailures'
import Currency, { RateAutoupdateSettings } from '../../domain/model/currency'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import CodeEditor from '../inputs/CodeEditor'
import { SecureButton } from '../shared/SecureButton'
import { useToast } from '../shared/ToastProvider'

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

interface Props {
  currency: Currency
  against: Currency
  scriptRunner: (script: string) => Promise<string>
  onUseRate(rate: number): void
}

const RateAutomation: FC<Props> = ({ currency, against, scriptRunner, onUseRate }) => {
  const { update: updateCurrency, refresh: refreshCurrencies } = useContext(CurrencyServiceContext)
  const { showToast } = useToast()

  const savedScript = currency.rateAutoupdateSettings.script
  const [script, setScript] = useState(savedScript === '' ? defaultScript : savedScript)
  const [enabled, setEnabled] = useState(currency.rateAutoupdateSettings.enabled)
  const [scriptOutput, setScriptOutput] = useState<number | null>(null)
  const [scriptError, setScriptError] = useState<string | null>(null)

  const onScriptChange = useCallback((value?: string) => {
    setScriptOutput(null)
    setScript(value ?? '')
  }, [])

  const testScript = async () => {
    const runnerResponse = await scriptRunner(script)
    const rate = Number.parseFloat(runnerResponse.replaceAll(',', '.'))
    if (isNaN(rate)) {
      setScriptError(`Invalid format or an error occurred: ${runnerResponse}`)
      return
    }

    setScriptError(null)
    setScriptOutput(rate)
  }

  let validationError: string | null = null
  if (enabled && script === defaultScript) {
    validationError =
      'You must edit the script before enabling autoupdates. Otherwise, this asset will be pinned to the default currency'
  } else if (enabled && script !== savedScript && (scriptError !== null || scriptOutput === null)) {
    validationError = 'You must have one successful run with the script before you can save it with autoupdate enabled.'
  }

  const scriptToSave = script === defaultScript ? savedScript : script
  const hasChanges = scriptToSave !== savedScript || enabled !== currency.rateAutoupdateSettings.enabled

  const save = async () => {
    try {
      await updateCurrency(
        { id: currency.id },
        { rateAutoupdateSettings: new RateAutoupdateSettings(scriptToSave, enabled) },
      )
      showToast('Rate automation saved')
      await refreshCurrencies()
    } catch (err) {
      showToast('Unexpected error while saving the rate automation', 'error')
      console.error(err)
    }
  }

  const discard = () => {
    setScript(savedScript === '' ? defaultScript : savedScript)
    setEnabled(currency.rateAutoupdateSettings.enabled)
    setScriptOutput(null)
    setScriptError(null)
  }

  return (
    <Stack spacing={2}>
      {hasRateFetchFailure(currency) && (
        <Alert severity="error">
          <AlertTitle>
            The nightly run failed on {formatDate(currency.rateFetchFailure!.at, "MMM d 'at' h:mm a")}
          </AlertTitle>
          <Box component="span" sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}>
            {currency.rateFetchFailure!.message}
          </Box>
          <Box sx={{ mt: 1 }}>Fix the script and save to clear this, or wait for the next successful run.</Box>
        </Alert>
      )}

      <Box sx={{ border: 1, borderColor: 'border.subtle', borderRadius: (t) => t.radius.md, overflow: 'hidden' }}>
        <CodeEditor content={script} onChange={onScriptChange} />
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.5}
          sx={{ px: 1.5, py: 1, borderTop: 1, borderColor: 'border.subtle', bgcolor: 'surface.subtle' }}
        >
          <SecureButton
            size="small"
            variant="outlined"
            onClick={testScript}
            sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Test run
          </SecureButton>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 0 }}>
            Runs the script once on the server without saving anything
          </Typography>
        </Stack>
      </Box>

      {scriptError !== null && (
        <Alert severity="error" sx={{ '& .MuiAlert-message': { minWidth: 0, overflowWrap: 'anywhere' } }}>
          {scriptError}
        </Alert>
      )}
      {scriptError === null && scriptOutput !== null && (
        <Alert
          severity="success"
          action={
            <Button color="inherit" size="small" onClick={() => onUseRate(scriptOutput)}>
              Record
            </Button>
          }
        >
          1 {currency.symbol} = {formatRate(scriptOutput)} {against.symbol}
        </Alert>
      )}

      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          p: 2,
          border: 1,
          borderColor: 'border.subtle',
          borderRadius: (t) => t.radius.md,
          bgcolor: 'surface.subtle',
        }}
      >
        <Stack sx={{ flexGrow: 1, minWidth: 0 }} spacing={0.5}>
          <Typography>Daily auto update</Typography>
          <Typography variant="caption" color={validationError === null ? 'text.secondary' : 'error'}>
            {validationError ?? 'Runs the script at 6AM and records the rate for the previous day.'}
          </Typography>
        </Stack>
        <Switch
          checked={enabled}
          onChange={(ev) => setEnabled(ev.target.checked)}
          inputProps={{ 'aria-label': 'daily auto update' }}
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={1}>
        {hasChanges && (
          <Button color="inherit" onClick={discard}>
            Discard
          </Button>
        )}
        <SecureButton variant="contained" disabled={!hasChanges || validationError !== null} onClick={save}>
          Save
        </SecureButton>
      </Stack>
    </Stack>
  )
}

export default RateAutomation
