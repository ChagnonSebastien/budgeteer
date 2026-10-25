import { Box } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useRef } from 'react'

import AccountsBalanceChart, { GroupType as AccountsGroupType } from '../components/graphing/AccountsBalanceChart'
import CurrenciesBalanceChart, { GroupType as CurrenciesGroupType } from '../components/graphing/CurrenciesBalanceChart'
import { FirstDivision, GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import { BaseLineConfig, ScaleConfig } from '../components/graphing/NetWorthChart'
import NetWorthHistoryChart from '../components/graphing/NetWorthHistoryChart'
import SelectOne from '../components/inputs/SelectOne'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { EmptyState, Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import useQueryParams from '../components/shared/useQueryParams'
import useWideLayout from '../components/shared/useWideLayout'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

type QueryParams = {
  view: string
  groupBy: string
  baselineConfig: string
  scale: string
  type: string
}

type View = 'total' | 'allocation'
type MajorType = 'accounts' | 'currencies'
type ActiveOrPassive = 'active' | 'passive'

const groupByOptionsConfig = [
  { value: 'none', label: 'Total', majorType: 'accounts' },
  { value: 'account', label: 'Account', majorType: 'accounts' },
  { value: 'accountType', label: 'Account type', majorType: 'accounts' },
  { value: 'financialInstitution', label: 'Institution', majorType: 'accounts' },
  { value: 'currency', label: 'Asset', majorType: 'currencies' },
  { value: 'currencyType', label: 'Asset type', majorType: 'currencies' },
  { value: 'risk', label: 'Risk level', majorType: 'currencies' },
]

const NetWorthPage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    dateNavigation,
    overview: filterOverview,
  } = useTransactionFilter({
    accountPreFilter: (account: Account) => account.isMine,
    canFilterByCategory: false,
  })

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const view = (qp.view ?? 'total') as View
  const groupBy = useMemo(() => (qp.groupBy ?? 'none') as AccountsGroupType | CurrenciesGroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const type = useMemo(() => (qp.type ?? 'active') as ActiveOrPassive, [qp.type])

  const majorType = useMemo(
    () => (groupByOptionsConfig.find((e) => e.value === groupBy)?.majorType ?? 'accounts') as MajorType,
    [groupBy],
  )

  // The chart only crops the axis when it draws a single stacked series.
  const canZoom = groupBy === 'none' || (majorType === 'accounts' && accountFilter?.length === 1)

  const { privacyMode } = useContext(DrawerContext)
  const scale = useMemo(() => {
    const chosen = (qp.scale ?? (privacyMode ? 'relative' : 'cropped-absolute')) as ScaleConfig
    return chosen === 'cropped-absolute' && !canZoom ? 'absolute' : chosen
  }, [qp.scale, privacyMode, canZoom])

  const previousPrivacyMode = useRef(privacyMode)
  useEffect(() => {
    if (previousPrivacyMode.current === privacyMode) return
    previousPrivacyMode.current = privacyMode
    // leaving with no scale chosen would fall back to the non-presentation default
    if (privacyMode || !qp.scale) updateQueryParams({ scale: 'relative' }, true)
  }, [privacyMode, qp.scale, updateQueryParams])

  const splitHorizontal = useWideLayout()
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const filterByAccounts = accountFilter === null ? undefined : accountFilter

  const chart =
    view === 'total' ? (
      <NetWorthHistoryChart
        fromDate={fromDate}
        toDate={toDate}
        filterByAccounts={filterByAccounts}
        navigation={dateNavigation}
      />
    ) : majorType === 'accounts' ? (
      <AccountsBalanceChart
        key="AccountsBalancePageFirstDivision"
        fromDate={fromDate}
        toDate={toDate}
        filterByAccounts={filterByAccounts}
        groupBy={groupBy as AccountsGroupType}
        navigation={dateNavigation}
        baselineConfig={baselineConfig}
        scale={scale}
        type={type}
      />
    ) : (
      <CurrenciesBalanceChart
        key="CurrenciesBalancePageFirstDivision"
        fromDate={fromDate}
        toDate={toDate}
        filterByAccounts={filterByAccounts}
        groupBy={groupBy as CurrenciesGroupType}
        navigation={dateNavigation}
        baselineConfig={baselineConfig}
        scale={scale}
        type={type}
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
        {myOwnAccounts.length === 0 ? (
          <EmptyState
            compact
            title="No net worth yet"
            description="Add an account to follow your net worth over time."
          />
        ) : (
          chart
        )}
      </GraphContainer>

      {splitHorizontal && <Box sx={{ p: 2 }}>{filterOverview}</Box>}
    </FirstDivision>
  )

  const selectType = splitHorizontal ? 'radio' : 'dropdown'
  const selectOptions = [
    <SelectOne
      key="view-option"
      label="View"
      value={view}
      onChange={(newValue) => updateQueryParams({ view: newValue === 'total' ? null : newValue })}
      options={[
        { value: 'total', label: 'Total' },
        { value: 'allocation', label: 'Allocation' },
      ]}
      type={selectType}
    />,
    <SelectOne
      key="holdings-or-debts"
      label="Show"
      value={type}
      onChange={(newValue) => updateQueryParams({ type: newValue })}
      options={[
        { value: 'active', label: 'Holdings' },
        { value: 'passive', label: 'Debts' },
      ]}
      type={selectType}
      disabled={view === 'total'}
    />,
    <SelectOne
      key="group-by-option"
      label="Group by"
      value={groupBy}
      onChange={(newValue) => updateQueryParams({ groupBy: newValue })}
      options={groupByOptionsConfig}
      type={selectType}
      disabled={view === 'total'}
    />,
    <SelectOne
      key="baseline-option"
      label="Book value"
      value={baselineConfig}
      onChange={(newValue) => updateQueryParams({ baselineConfig: newValue })}
      options={[
        { value: 'none', label: 'Hidden' },
        { value: 'showIndividualBaselines', label: 'Per group' },
        { value: 'showGlobalBaseline', label: 'Total' },
      ]}
      type={selectType}
      disabled={view === 'total'}
    />,
    <SelectOne
      key="scale-option"
      label="Scale"
      value={scale}
      onChange={(newValue) => updateQueryParams({ scale: newValue })}
      options={[
        { value: 'absolute', label: 'From zero' },
        { value: 'cropped-absolute', label: 'Zoomed', disabled: !canZoom },
        { value: 'relative', label: 'Share of total (%)' },
      ]}
      type={selectType}
      disabled={view === 'total'}
    />,
  ]

  const secondDivision = (
    <SecondDivision $splitView={splitHorizontal} sx={{ bgcolor: splitHorizontal ? undefined : 'surface.subtle' }}>
      {!splitHorizontal && filterOverview}

      {splitHorizontal ? (
        selectOptions
      ) : (
        <Row
          sx={{
            gap: { xs: 1.5, sm: 2 },
            flexFlow: 'wrap',
            display: { xs: 'grid', sm: 'flex' },
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          }}
        >
          {selectOptions}
        </Row>
      )}
    </SecondDivision>
  )

  return (
    <ContentWithHeader
      title="Net Worth"
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

export default NetWorthPage
