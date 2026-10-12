import { Autocomplete, Box, Checkbox, TextField, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import ExchangeRateComparison, { useHeldCurrencyIds } from '../components/graphing/ExchangeRateComparison'
import { FirstDivision, GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import InvestmentGainLineChart from '../components/graphing/InvestmentGainLineChart'
import SelectOne from '../components/inputs/SelectOne'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { EmptyState, Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import useQueryParams from '../components/shared/useQueryParams'
import useWideLayout from '../components/shared/useWideLayout'
import Currency, { CurrencyID } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'
import { darkColors, searchFilterOptions } from '../utils'

type QueryParams = {
  view: string
}

type View = 'returns' | 'gains'

const selectedCurrenciesKey = 'investmentsPerformance.selectedCurrencies'

const readStoredSelection = (): CurrencyID[] | null => {
  try {
    const stored = JSON.parse(localStorage.getItem(selectedCurrenciesKey) ?? 'null')
    return Array.isArray(stored) ? stored.filter((id) => typeof id === 'number') : null
  } catch {
    return null
  }
}

const storeSelection = (ids: CurrencyID[]) => {
  try {
    localStorage.setItem(selectedCurrenciesKey, JSON.stringify(ids))
  } catch {
    // Storage blocked: the selection only lasts for this visit.
  }
}

const InvestmentsPerformancePage: FC = () => {
  const {
    fromDate,
    toDate,
    dateNavigation,
    overview: filterOverview,
  } = useTransactionFilter({ canFilterByCategory: false, canFilterByAccount: false })

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const view = (qp.view ?? 'returns') as View

  const { defaultCurrency } = useContext(MixedAugmentation)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const heldCurrencyIds = useHeldCurrencyIds()
  const [storedSelection, setStoredSelection] = useState(readStoredSelection)

  const assets = useMemo(() => currencies.filter((c) => c.id !== defaultCurrency.id), [currencies, defaultCurrency])
  const colorOf = useMemo(() => {
    const colors = new Map(assets.map((c, i) => [c.id, darkColors[i % darkColors.length]]))
    return (id: CurrencyID) => colors.get(id) ?? darkColors[0]
  }, [assets])
  const options = useMemo(
    () => [...assets].sort((a, b) => Number(heldCurrencyIds.has(b.id)) - Number(heldCurrencyIds.has(a.id))),
    [assets, heldCurrencyIds],
  )

  const selectedIds = useMemo(
    () => storedSelection ?? assets.filter((c) => heldCurrencyIds.has(c.id)).map((c) => c.id),
    [storedSelection, assets, heldCurrencyIds],
  )
  const selected = useMemo(() => assets.filter((c) => selectedIds.includes(c.id)), [assets, selectedIds])

  const select = (value: Currency[]) => {
    const ids = value.map((c) => c.id)
    storeSelection(ids)
    setStoredSelection(ids)
  }

  const splitHorizontal = useWideLayout()

  const chart =
    view === 'gains' ? (
      <InvestmentGainLineChart fromDate={fromDate} toDate={toDate} navigation={dateNavigation} />
    ) : assets.length === 0 ? (
      <EmptyState
        compact
        title="Follow how your investments perform"
        description={`Add an asset other than ${defaultCurrency.symbol}, like a stock or an ETF, to compare its performance and your gains here.`}
        action={{ label: 'Add an asset', path: '/assets/new' }}
      />
    ) : selected.length === 0 ? (
      <EmptyState compact title="No asset selected" description="Pick the assets to compare." />
    ) : (
      <ExchangeRateComparison
        startDate={fromDate}
        endDate={toDate}
        currencyIds={selectedIds}
        colorOf={colorOf}
        navigation={dateNavigation}
      />
    )

  const firstDivision = (
    <FirstDivision>
      <GraphContainer
        style={{
          minHeight: 'max(50vh, 300px)',
          display: 'flex',
          alignItems: 'stretch',
          justifyContent: 'stretch',
          flexGrow: 1,
        }}
      >
        {chart}
      </GraphContainer>

      {splitHorizontal && <Box sx={{ p: 2 }}>{filterOverview}</Box>}
    </FirstDivision>
  )

  const viewOption = (
    <SelectOne
      key="view-option"
      label="Show"
      value={view}
      onChange={(newValue) => updateQueryParams({ view: newValue === 'returns' ? null : newValue })}
      options={[
        { value: 'returns', label: 'Asset returns (%)' },
        { value: 'gains', label: 'Total gains' },
      ]}
      type={splitHorizontal ? 'radio' : 'dropdown'}
    />
  )

  const assetsOption = assets.length > 0 && (
    <Autocomplete
      key="assets-option"
      multiple
      disabled={view === 'gains'}
      disableCloseOnSelect
      filterOptions={searchFilterOptions}
      options={options}
      groupBy={(c) => (heldCurrencyIds.has(c.id) ? 'Held' : 'Not held')}
      value={selected}
      onChange={(_, value) => select(value)}
      getOptionLabel={(c) => c.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderValue={(value) => (
        <Typography variant="body2" noWrap sx={{ pl: 0.5 }}>
          {value.length === 1 ? value[0].name : `${value.length} of ${assets.length} assets`}
        </Typography>
      )}
      renderOption={({ key, ...optionProps }, c, { selected: checked }) => (
        <li key={key} {...optionProps}>
          <Checkbox checked={checked} size="small" sx={{ p: 0.5, mr: 1 }} />
          <Box
            sx={{ flexShrink: 0, width: '10px', height: '10px', borderRadius: '50%', bgcolor: colorOf(c.id), mr: 1 }}
          />
          {c.name}
        </li>
      )}
      renderInput={(params) => <TextField {...params} variant="standard" label="Assets" />}
      slotProps={{ popper: { sx: { minWidth: 'min(25rem, calc(100vw - 32px))' } } }}
      sx={{
        flexGrow: splitHorizontal ? 0 : 1,
        width: (theme) => (splitHorizontal ? theme.fieldWidth.md : undefined),
      }}
    />
  )

  const secondDivision = (
    <SecondDivision $splitView={splitHorizontal} sx={{ bgcolor: splitHorizontal ? undefined : 'surface.subtle' }}>
      {!splitHorizontal && filterOverview}

      {splitHorizontal ? (
        [viewOption, assetsOption]
      ) : (
        <Row sx={{ gap: { xs: 1.5, sm: 2 }, flexFlow: 'wrap' }}>
          {viewOption}
          {assetsOption}
        </Row>
      )}
    </SecondDivision>
  )

  return (
    <ContentWithHeader
      title="Investments Performance"
      action="menu"
      withScrolling={!splitHorizontal}
      scrollEndSx={{ bgcolor: 'surface.subtle' }}
    >
      <SplitView
        first={firstDivision}
        second={secondDivision}
        split={splitHorizontal ? 'horizontal' : 'vertical'}
        firstZoneStyling={{ grow: true, scroll: splitHorizontal }}
        secondZoneStyling={{ grow: false, scroll: true }}
      />
    </ContentWithHeader>
  )
}

export default InvestmentsPerformancePage
