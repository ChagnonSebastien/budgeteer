import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import ExchangeRateComparison from '../components/graphing/ExchangeRateComparison'
import { GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useElementDimensions, useWindowDimensions } from '../components/shared/useDimensions'

const InvestmentsPerformancePage: FC = () => {
  const { height: pageHeight } = useWindowDimensions()
  const { height: contentHeight, ref: setContentRef } = useElementDimensions(600, 600)
  const { height: optionsHeight, ref: setOptionsRef } = useElementDimensions(600, 600)

  const {
    fromDate,
    toDate,
    overview: filterOverview,
  } = useTransactionFilter({ canFilterByCategory: false, canFilterByAccount: false })
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
        sx={{ flexDirection: 'row', columnGap: 6, flexWrap: 'wrap', rowGap: 2, bgcolor: 'surface.subtle' }}
        ref={setOptionsRef}
      >
        <Box sx={{ flexGrow: 1, width: '100%' }}>{filterOverview}</Box>
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default InvestmentsPerformancePage
