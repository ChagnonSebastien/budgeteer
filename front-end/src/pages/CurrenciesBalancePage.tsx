import { Box, Typography } from '@mui/material'
import { FC, Suspense, useMemo } from 'react'

import CurrenciesBalanceChart, { GroupType } from '../components/graphing/CurrenciesBalanceChart'
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

const CurrenciesBalancePage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
    showSlider,
  } = useTransactionFilter((account: Account) => account.isMine, false)

  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const groupBy = useMemo(() => (qp.groupBy ?? 'currency') as GroupType, [qp.groupBy])
  const baselineConfig = useMemo(() => (qp.baselineConfig ?? 'none') as BaseLineConfig, [qp.baselineConfig])
  const scale = useMemo(() => (qp.scale ?? 'cropped-absolute') as ScaleConfig, [qp.scale])

  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const { width: contentWidth, height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)

  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const graphSection = (
    <FirstDivision>
      <GraphContainer
        style={{
          padding: '1rem 0 1rem 0',
          height: splitHorizontal
            ? showSlider
              ? contentHeight - 200
              : contentHeight - 100
            : contentHeight - optionsHeight,
        }}
      >
        <Suspense
          fallback={
            <Row
              style={{
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary">
                Loading chart data...
              </Typography>
            </Row>
          }
        >
          <CurrenciesBalanceChart
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
            groupBy={groupBy}
            baselineConfig={baselineConfig}
            scale={scale}
          />
        </Suspense>
      </GraphContainer>

      {splitHorizontal && <Box sx={{ padding: '0 1rem' }}>{filterOverview}</Box>}
    </FirstDivision>
  )

  const selectOptions = [
    <SelectOne
      label="Group by"
      value={groupBy}
      onChange={(newValue) => updateQueryParams({ groupBy: newValue })}
      options={[
        { value: 'none', label: 'None' },
        { value: 'currency', label: 'Currency' },
        { value: 'type', label: 'Type' },
        { value: 'risk', label: 'Risk' },
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

export default CurrenciesBalancePage
