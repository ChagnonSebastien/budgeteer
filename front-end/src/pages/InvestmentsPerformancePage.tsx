import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import ExchangeRateComparison from '../components/graphing/ExchangeRateComparison'
import { GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import { useDateFilter } from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useElementDimensions, useWindowDimensions } from '../components/shared/useDimensions'
import useQueryParams from '../components/shared/useQueryParams'
import { CurrencyID } from '../domain/model/currency'

type QueryParams = {
  currencies: string
}

const InvestmentsPerformancePage: FC = () => {
  const { queryParams: qp, updateQueryParams } = useQueryParams<QueryParams>()
  const selectedCurrencies = useMemo<CurrencyID[]>(() => JSON.parse(qp.currencies || '[]'), [qp.currencies])

  const { height: pageHeight } = useWindowDimensions()
  const { height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)
  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const { quickFilter, toDate, fromDate, slider } = useDateFilter()
  const timeRange = useMemo<[Date, Date]>(() => [fromDate, toDate], [fromDate, toDate])

  const contentTooTall = useMemo(
    () => Math.max(pageHeight / 2, 300) + optionsHeight + 64 > pageHeight,
    [optionsHeight, pageHeight],
  )

  return (
    <ContentWithHeader
      title="Investments Performance"
      action="menu"
      setContentRef={setContentRef}
      withScrolling={contentTooTall}
    >
      <GraphContainer
        style={{
          height: contentHeight - optionsHeight,
          minHeight: 'max(50vh, 300px)',
          display: 'flex',
          justifyContent: 'stretch',
          alignItems: 'stretch',
        }}
      >
        <ExchangeRateComparison startDate={timeRange[0]} endDate={timeRange[1]} />
      </GraphContainer>

      <SecondDivision
        style={{
          flexDirection: 'row',
          columnGap: '3rem',
          flexWrap: 'wrap',
          rowGap: '1rem',
          backgroundColor: 'rgba(128, 128, 128, 0.04)',
        }}
        ref={setOptionsRef}
      >
        <Box style={{ flexGrow: 1, width: '100%' }}>
          {quickFilter}
          {slider}
        </Box>
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default InvestmentsPerformancePage
