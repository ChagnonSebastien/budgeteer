import { Badge, Box, Stack, Tab, Tabs } from '@mui/material'
import { startOfDay } from 'date-fns'
import { FC, useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ExchangeRatePoints, { PointDraft, rateInput } from '../components/currencies/ExchangeRatePoints'
import RateAutomation from '../components/currencies/RateAutomation'
import { hasRateFetchFailure } from '../components/currencies/useRateFetchFailures'
import ExchangeRateHistory from '../components/graphing/ExchangeRateHistory'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { FormSection } from '../components/shared/FormWrapper'
import useQueryParams from '../components/shared/useQueryParams'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Params = {
  currencyId: string
}

interface Props {
  scriptRunner: (script: string) => Promise<string>
}

const CurrencyRatesPage: FC<Props> = ({ scriptRunner }) => {
  const navigate = useNavigate()
  const { currencyId } = useParams<Params>()
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const [draft, setDraft] = useState<PointDraft | null>(null)
  const { queryParams, updateQueryParams } = useQueryParams<{ tab?: string }>()
  const tab = queryParams.tab === 'fetcher' ? 'fetcher' : 'rates'

  const currency = currencies.find((c) => c.id === parseInt(currencyId!))
  const isUnavailable = typeof currency === 'undefined' || currency.id === defaultCurrency.id

  useEffect(() => {
    if (isUnavailable) navigate('/assets', { replace: true })
  }, [isUnavailable, navigate])

  if (isUnavailable) return null

  return (
    <ContentWithHeader title={`${currency.name} rates`} action="return" withPadding withScrolling>
      <Stack spacing={2} sx={{ mt: 2, width: '100%', maxWidth: (t) => t.contentWidth.default }}>
        <FormSection title="History">
          <Box sx={{ height: 200, display: 'flex' }}>
            <ExchangeRateHistory currency={currency} against={defaultCurrency} />
          </Box>
        </FormSection>

        <Tabs
          variant="fullWidth"
          value={tab}
          onChange={(_ev, value) => updateQueryParams({ tab: value === 'rates' ? null : value }, true)}
        >
          <Tab label={`Rates in ${defaultCurrency.symbol}`} value="rates" />
          <Tab
            label={
              <Badge color="error" variant="dot" invisible={!hasRateFetchFailure(currency)} sx={{ pr: 1 }}>
                Fetcher
              </Badge>
            }
            value="fetcher"
          />
        </Tabs>

        {/* Both stay mounted so unsaved script edits survive a tab switch. */}
        <Box sx={{ display: tab === 'rates' ? 'block' : 'none' }}>
          <ExchangeRatePoints currency={currency} against={defaultCurrency} draft={draft} onDraftChange={setDraft} />
        </Box>

        <Box sx={{ display: tab === 'fetcher' ? 'block' : 'none' }}>
          <RateAutomation
            currency={currency}
            against={defaultCurrency}
            scriptRunner={scriptRunner}
            onUseRate={(rate) => setDraft({ editing: null, date: startOfDay(new Date()), rate: rateInput(rate) })}
          />
        </Box>
      </Stack>
    </ContentWithHeader>
  )
}

export default CurrencyRatesPage
