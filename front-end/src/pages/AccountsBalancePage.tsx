import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import AccountsBalanceChart, { GroupType } from '../components/graphing/AccountsBalanceChart'
import {
  FirstDivision,
  GraphContainer,
  GraphPageContainer,
  SecondDivision,
} from '../components/graphing/GraphStyledComponents'
import { BaseLineConfig, ScaleConfig } from '../components/graphing/NetWorthChart'
import SelectOne from '../components/inputs/SelectOne'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions } from '../components/shared/useDimensions'
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
    showSlider,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const groupBy = useMemo(() => (qp.groupBy ?? 'account') as GroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const scale = useMemo(() => (qp.scale ?? 'absolute') as ScaleConfig, [qp.scale])

  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const { ref: setContentRef, height: contentHeight, width: contentWidth } = useElementDimensions(600, 600)

  console.log(optionsHeight, contentHeight)

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graphSection = useMemo(
    () => (
      <FirstDivision style={{ overflowY: 'auto' }}>
        <GraphContainer
          style={{
            padding: '1rem 0',
            height: splitHorizontal
              ? showSlider
                ? contentHeight - 240
                : contentHeight - 100
              : contentHeight === optionsHeight
                ? '100vh'
                : contentHeight - optionsHeight,
          }}
        >
          <AccountsBalanceChart
            key="AccountBalancePageFirstDivision"
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
            groupBy={groupBy}
            baselineConfig={baselineConfig}
            scale={scale}
          />
        </GraphContainer>

        {splitHorizontal && <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>}
      </FirstDivision>
    ),
    [
      fromDate,
      toDate,
      accountFilter,
      groupBy,
      baselineConfig,
      scale,
      splitHorizontal,
      showSlider,
      contentHeight,
      optionsHeight,
      filterOverview,
    ],
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

  const controlsSection = (
    <SecondDivision $splitView={splitHorizontal} ref={setOptionsRef}>
      {!splitHorizontal && filterOverview}

      {splitHorizontal ? selectOptions : <Row style={{ gap: '1rem', flexFlow: 'wrap' }}>{selectOptions}</Row>}
    </SecondDivision>
  )

  return (
    <ContentWithHeader title="Balances" action="menu" setContentRef={setContentRef}>
      <GraphPageContainer>
        {splitHorizontal ? (
          <SplitView
            first={graphSection}
            second={controlsSection}
            split="horizontal"
            firstZoneStyling={{ grow: true, scroll: true }}
            secondZoneStyling={{ grow: false, scroll: true }}
          />
        ) : (
          <div>
            {graphSection}
            {controlsSection}
          </div>
        )}
      </GraphPageContainer>
    </ContentWithHeader>
  )
}

export default AccountsBalancePage
