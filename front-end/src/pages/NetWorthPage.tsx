import { Box } from '@mui/material'
import { FC, useContext } from 'react'

import { FirstDivision, GraphContainer, SecondDivision } from '../components/graphing/GraphStyledComponents'
import NetWorthHistoryChart from '../components/graphing/NetWorthHistoryChart'
import useTransactionFilter from '../components/inputs/useTransactionFilter'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { EmptyState } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import useWideLayout from '../components/shared/useWideLayout'
import Account from '../domain/model/account'
import { AccountServiceContext } from '../service/ServiceContext'

const NetWorthPage: FC = () => {
  const {
    fromDate,
    toDate,
    accountFilter,
    overview: filterOverview,
  } = useTransactionFilter({
    accountPreFilter: (account: Account) => account.isMine,
    canFilterByCategory: false,
  })

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
          <EmptyState
            compact
            title="No net worth yet"
            description="Add an account to follow your net worth over time."
          />
        ) : (
          <NetWorthHistoryChart
            fromDate={fromDate}
            toDate={toDate}
            filterByAccounts={accountFilter === null ? undefined : accountFilter}
          />
        )}
      </GraphContainer>

      {splitHorizontal && <Box sx={{ p: 2 }}>{filterOverview}</Box>}
    </FirstDivision>
  )

  const secondDivision = !splitHorizontal && (
    <SecondDivision sx={{ bgcolor: 'surface.subtle' }}>{filterOverview}</SecondDivision>
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
