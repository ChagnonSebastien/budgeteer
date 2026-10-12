import { Box } from '@mui/material'
import { FC, useContext, useMemo } from 'react'

import AccountsBalanceChart, { GroupType as AccountsGroupType } from '../components/graphing/AccountsBalanceChart'
import CurrenciesBalanceChart, { GroupType as CurrenciesGroupType } from '../components/graphing/CurrenciesBalanceChart'
import { FirstDivision, GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import { BaseLineConfig, ScaleConfig } from '../components/graphing/NetWorthChart'
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
  groupBy: string
  baselineConfig: string
  scale: string
  type: string
}

const groupByOptionsConfig = [
  { value: 'none', label: 'None', majorType: 'accounts' },
  { value: 'account', label: 'Account', majorType: 'accounts' },
  { value: 'accountType', label: 'Account Type', majorType: 'accounts' },
  { value: 'financialInstitution', label: 'Financial Institution', majorType: 'accounts' },
  { value: 'currency', label: 'Currency', majorType: 'currencies' },
  { value: 'currencyType', label: 'Currency Type', majorType: 'currencies' },
  { value: 'risk', label: 'Risk', majorType: 'currencies' },
]

export type MajorType = 'accounts' | 'currencies'
export type ActiveOrPassive = 'active' | 'passive'

const BalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
  } = useTransactionFilter({
    accountPreFilter: (account: Account) => account.isMine,
    canFilterByCategory: false,
  })

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const groupBy = useMemo(() => (qp.groupBy ?? 'account') as AccountsGroupType | CurrenciesGroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const { privacyMode } = useContext(DrawerContext)
  const scale = useMemo(
    () => (qp.scale ?? (privacyMode ? 'relative' : 'cropped-absolute')) as ScaleConfig,
    [qp.scale, privacyMode],
  )
  const type = useMemo(() => (qp.type ?? 'active') as ActiveOrPassive, [qp.type])

  const majorType = useMemo(
    () => (groupByOptionsConfig.find((e) => e.value === groupBy)?.majorType ?? 'accounts') as MajorType,
    [groupBy],
  )

  const splitHorizontal = useWideLayout()
  const { myOwnAccounts } = useContext(AccountServiceContext)

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
          <EmptyState compact title="No balances yet" description="Add an account to follow its balance over time." />
        ) : majorType === 'accounts' ? (
          <AccountsBalanceChart
            key="AccountsBalancePageFirstDivision"
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
            groupBy={groupBy as AccountsGroupType}
            baselineConfig={baselineConfig}
            scale={scale}
            type={type}
          />
        ) : (
          <CurrenciesBalanceChart
            key="CurrenciesBalancePageFirstDivision"
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
            groupBy={groupBy as CurrenciesGroupType}
            baselineConfig={baselineConfig}
            scale={scale}
            type={type}
          />
        )}
      </GraphContainer>

      {splitHorizontal && <Box sx={{ p: 2 }}>{filterOverview}</Box>}
    </FirstDivision>
  )

  const selectOptions = [
    <SelectOne
      key="group-by-active-passive"
      label="Active or Passive"
      value={type}
      onChange={(newValue) => updateQueryParams({ type: newValue })}
      options={[
        { value: 'active', label: 'Actives' },
        { value: 'passive', label: 'Passives' },
      ]}
      type={splitHorizontal ? 'radio' : 'dropdown'}
    />,
    <SelectOne
      key="group-by-option"
      label="Group by"
      value={groupBy}
      onChange={(newValue) => updateQueryParams({ groupBy: newValue })}
      options={groupByOptionsConfig}
      type={splitHorizontal ? 'radio' : 'dropdown'}
    />,
    <SelectOne
      key="baseline-option"
      label="Baseline"
      value={baselineConfig}
      onChange={(newValue) => updateQueryParams({ baselineConfig: newValue })}
      options={[
        { value: 'none', label: 'None' },
        { value: 'showIndividualBaselines', label: 'Individual Book Value' },
        { value: 'showGlobalBaseline', label: 'Global Book Value' },
      ]}
      type={splitHorizontal ? 'radio' : 'dropdown'}
    />,
    <SelectOne
      key="scale-option"
      label="Scale"
      value={scale}
      onChange={(newValue) => updateQueryParams({ scale: newValue })}
      options={[
        { value: 'absolute', label: 'Absolute' },
        { value: 'cropped-absolute', label: 'Cropped Absolute' },
        { value: 'relative', label: 'Relative (%)' },
      ]}
      type={splitHorizontal ? 'radio' : 'dropdown'}
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
      title="Balances"
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

export default BalancePage
