import { Box, Card } from '@mui/material'
import { BarDatum, ResponsiveBar } from '@nivo/bar'
import { formatDate, startOfDay, subMonths } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import InvestmentGainLineChart from '../components/graphing/InvestmentGainLineChart'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import NoteContainer, { Column, Row } from '../components/shared/NoteContainer'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

const lastYear = startOfDay(subMonths(new Date(), 12))
const today = startOfDay(new Date())

interface CashFlowDataPoint {
  month: Date
  inflow: number
  outflow: number
}

const CashFlowBarChart: FC<{ data: CashFlowDataPoint[] }> = ({ data }) => {
  const { privacyMode } = useContext(DrawerContext)
  const { defaultCurrency } = useContext(MixedAugmentation)

  // convert outflow to negative for diverging chart
  const barData = useMemo<BarDatum[]>(
    () =>
      data.map((d) => ({
        month: formatDate(d.month, 'MMM d, yy'),
        Inflow: d.inflow,
        Outflow: -d.outflow,
      })),
    [data],
  )

  return (
    <ResponsiveBar
      data={barData}
      keys={['Inflow', 'Outflow']}
      indexBy="month"
      margin={{ top: 20, right: 20, bottom: 60, left: 50 }}
      padding={0.3}
      groupMode="stacked"
      valueScale={{ type: 'linear' }}
      indexScale={{ type: 'band', round: true }}
      colors={({ id }) => (id === 'Inflow' ? '#4caf50' : '#f44336')}
      colorBy="id"
      theme={darkTheme}
      enableGridY={true}
      isInteractive={true}
      tooltip={({ id, value, indexValue }) => (
        <Card>
          <div className="p-2 flex flex-col items-center">
            <div className="font-bold">{indexValue}</div>
            {!privacyMode && (
              <div>
                {formatFull(defaultCurrency, Math.abs(Number(value)), privacyMode)} {id}
              </div>
            )}
          </div>
        </Card>
      )}
      axisTop={null}
      axisRight={null}
      axisBottom={{
        tickRotation: -45,
        tickSize: 5,
        tickPadding: 8,
      }}
      axisLeft={{
        tickSize: privacyMode ? 0 : 5,
        tickPadding: 8,
        format: (i: number) =>
          privacyMode
            ? ''
            : (Math.abs(i) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
      }}
      enableLabel={false}
    />
  )
}

const Dashboard: FC = () => {
  const { accountBalances, augmentedTransactions, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { state: accounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  // Net Worth Summary
  const netWorth = useMemo(() => {
    let total = 0
    accountBalances.forEach((currencyMap, account) => {
      if (!accounts.find((a) => a.id === account)?.isMine) return

      currencyMap.forEach((value, currencyId) => {
        const rate =
          currencyId === defaultCurrency.id ? 1 : exchangeRateOnDay(currencyId, defaultCurrency.id, new Date())
        total += value * rate
      })
    })
    return total
  }, [accountBalances, exchangeRateOnDay, defaultCurrency, accounts])

  // Cash Flow & Key Metrics (external flows only, using isMine)
  const cashFlowData: CashFlowDataPoint[] = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => {
      return subMonths(new Date(), i)
    }).reverse()

    return months.map((month) => {
      const year = month.getFullYear()
      const m = month.getMonth()

      // Inflow: money coming into my accounts from external
      const inflow = augmentedTransactions
        .filter(
          (tx) =>
            typeof tx.category !== 'undefined' &&
            tx.category?.name !== 'Financial income' &&
            !(tx.receiver?.isMine && tx.sender?.isMine),
        )
        .filter(
          (tx) =>
            tx.receiver?.isMine && !tx.sender?.isMine && tx.date.getFullYear() === year && tx.date.getMonth() === m,
        )
        .reduce((sum, tx) => {
          const rate =
            tx.receiverCurrencyId === defaultCurrency.id
              ? 1
              : exchangeRateOnDay(tx.receiverCurrencyId, defaultCurrency.id, tx.date)
          return sum + tx.receiverAmount * rate
        }, 0)

      // Outflow: money leaving my accounts to external
      const outflow = augmentedTransactions
        .filter(
          (tx) =>
            typeof tx.category !== 'undefined' &&
            tx.category?.name !== 'Financial income' &&
            !(tx.receiver?.isMine && tx.sender?.isMine),
        )
        .filter(
          (tx) =>
            tx.sender?.isMine && !tx.receiver?.isMine && tx.date.getFullYear() === year && tx.date.getMonth() === m,
        )
        .reduce((sum, tx) => {
          const rate =
            tx.currencyId === defaultCurrency.id ? 1 : exchangeRateOnDay(tx.currencyId, defaultCurrency.id, tx.date)
          return sum + tx.amount * rate
        }, 0)

      return { month, inflow, outflow }
    })
  }, [augmentedTransactions, exchangeRateOnDay, defaultCurrency])

  const totalInflow = cashFlowData.reduce((sum, d) => sum + d.inflow, 0)
  const totalOutflow = cashFlowData.reduce((sum, d) => sum + d.outflow, 0)
  const surplus = totalInflow - totalOutflow
  const savingsRate = totalInflow > 0 ? surplus / totalInflow : 0

  return (
    <ContentWithHeader title="Dashboard" button="menu" contentMaxWidth="50rem" contentPadding="1rem">
      {/* Net Worth */}

      <NoteContainer
        title="Net Worth"
        sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '2.5rem',
            fontWeight: 'bold',
          }}
        >
          {formatFull(defaultCurrency, netWorth, privacyMode)}
        </p>
      </NoteContainer>

      {/* Investments */}

      <NoteContainer title="Investments Performance">
        <div style={{ height: '20rem', width: '100%' }}>
          <InvestmentGainLineChart fromDate={lastYear} toDate={today} />
        </div>
      </NoteContainer>

      {/* Cash Flow */}

      <NoteContainer title="Cash Flow">
        <div style={{ height: '20rem', width: '100%' }}>
          <CashFlowBarChart data={cashFlowData} />
        </div>
        <Box height="1rem" />
        <Row
          style={{
            justifyContent: 'space-around',
          }}
        >
          <Column>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: '#888',
              }}
            >
              Savings Rate
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
              }}
            >
              {(savingsRate * 100).toFixed(1)}%
            </span>
          </Column>
          <Column>
            <span
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: '#888',
              }}
            >
              Surplus
            </span>
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: 600,
              }}
            >
              {formatFull(defaultCurrency, surplus, privacyMode)}
            </span>
          </Column>
        </Row>
      </NoteContainer>
    </ContentWithHeader>
  )
}

export default Dashboard
