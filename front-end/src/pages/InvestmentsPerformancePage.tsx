import { Box } from '@mui/material'
import { FC, useMemo } from 'react'

import ExchangeRateComparison from '../components/graphing/ExchangeRateComparison'
import { GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'

const InvestmentsPerformancePage: FC = () => {
  const {
    fromDate,
    toDate,
    overview: filterOverview,
  } = useTransactionFilter({ canFilterByCategory: false, canFilterByAccount: false })
  const timeRange = useMemo<[Date, Date]>(() => [fromDate, toDate], [fromDate, toDate])

  return (
    <ContentWithHeader title="Investments Performance" action="menu" withScrolling>
      <GraphContainer sx={{ flex: '1 0 max(50vh, 300px)', display: 'flex' }}>
        <ExchangeRateComparison startDate={timeRange[0]} endDate={timeRange[1]} />
      </GraphContainer>

      <SecondDivision
        sx={{
          flexDirection: 'row',
          columnGap: { xs: 2, sm: 6 },
          flexWrap: 'wrap',
          rowGap: { xs: 1.5, sm: 2 },
          bgcolor: 'surface.subtle',
          flexShrink: 0,
        }}
      >
        <Box sx={{ flexGrow: 1, width: '100%' }}>{filterOverview}</Box>
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default InvestmentsPerformancePage
