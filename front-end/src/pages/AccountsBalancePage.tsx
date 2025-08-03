import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import AccountsBalanceChart, { GroupType } from '../components/graphing/AccountsBalanceChart'
import { FirstDivision, GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import { BaseLineConfig, ScaleConfig } from '../components/graphing/NetWorthChart'
import SelectOne from '../components/inputs/SelectOne'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions, useWindowDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import Account from '../domain/model/account'

type QueryParams = {
  groupBy: string
  baselineConfig: string
  scale: string
}

const AccountsBalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const groupBy = useMemo(() => (qp.groupBy ?? 'account') as GroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const scale = useMemo(() => (qp.scale ?? 'absolute') as ScaleConfig, [qp.scale])

  const { height: pageHeight } = useWindowDimensions()
  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)
  const { ref: setContentRef, height: contentHeight, width: contentWidth } = useElementDimensions(600, 600)

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])
  const contentTooTall = useMemo(
    () => Math.max(pageHeight / 2, 300) + optionsHeight + 64 > pageHeight,
    [optionsHeight, pageHeight],
  )

  const firstDivision = (
    <FirstDivision>
      <GraphContainer
        style={{
          height: contentHeight - optionsHeight,
          minHeight: 'max(50vh, 300px)',
        }}
      >
        <AccountsBalanceChart
          key="AccountsBalancePageFirstDivision"
          fromDate={fromDate}
          toDate={toDate}
          filterByAccounts={accountFilter === null ? undefined : accountFilter}
          groupBy={groupBy}
          baselineConfig={baselineConfig}
          scale={scale}
        />
      </GraphContainer>

      {splitHorizontal && (
        <Box sx={{ padding: '1rem' }} ref={setOptionsRef}>
          {filterOverview}
        </Box>
      )}
    </FirstDivision>
  )

  const selectOptions = [
    <SelectOne
      label="Group by"
      value={groupBy}
      onChange={(newValue) => updateQueryParams({ groupBy: newValue })}
      options={[
        { value: 'none', label: 'None' },
        { value: 'account', label: 'Account' },
        { value: 'financialInstitution', label: 'Financial Institution' },
        { value: 'type', label: 'Type' },
      ]}
      type={splitHorizontal ? 'radio' : 'dropdown'}
    />,
    <SelectOne
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
    <SecondDivision $splitView={splitHorizontal} ref={!splitHorizontal ? setOptionsRef : undefined}>
      {!splitHorizontal && filterOverview}

      {splitHorizontal ? selectOptions : <Row style={{ gap: '1rem', flexFlow: 'wrap' }}>{selectOptions}</Row>}
    </SecondDivision>
  )

  return (
    <ContentWithHeader
      title="Balances"
      action="menu"
      setContentRef={setContentRef}
      withScrolling={!splitHorizontal && contentTooTall}
    >
      {splitHorizontal ? (
        <SplitView
          first={firstDivision}
          second={secondDivision}
          split="horizontal"
          firstZoneStyling={{ grow: true, scroll: contentTooTall }}
          secondZoneStyling={{ grow: false, scroll: true }}
        />
      ) : (
        <>
          {firstDivision}
          {secondDivision}
        </>
      )}
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
