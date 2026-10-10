import { Box, Stack, Typography, useTheme } from '@mui/material'
import { BarDatum, ResponsiveBar } from '@nivo/bar'
import { formatDate, startOfDay, subMonths } from 'date-fns'
import React, { FC, useContext, useMemo } from 'react'

import GettingStarted from '../components/dashboard/GettingStarted'
import { GraphTooltip, GraphTooltipDate } from '../components/graphing/GraphStyledComponents'
import InvestmentGainLineChart from '../components/graphing/InvestmentGainLineChart'
import { DrawerContext } from '../components/Menu'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { PageBody, Section, Stat } from '../components/shared/Layout'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'
import { darkTheme } from '../utils'

const lastYear = startOfDay(subMonths(new Date(), 12))
const today = startOfDay(new Date())
// Widest per-character advance measured for formatted amounts in the hero font (800 weight).
const HERO_CHAR_WIDTH_EM = 0.6

interface CashFlowDataPoint {
  month: Date
  inflow: number
  outflow: number
}

const CashFlowBarChart: FC<{ data: CashFlowDataPoint[] }> = ({ data }) => {
  const { privacyMode } = useContext(DrawerContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const theme = useTheme()

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
      valueScale={{ type: 'linear', nice: true, min: 'auto' }}
      indexScale={{ type: 'band', round: true }}
      colors={({ id }) => (id === 'Inflow' ? theme.palette.money.gain : theme.palette.money.loss)}
      colorBy="id"
      theme={darkTheme}
      tooltip={({ id, value, indexValue }) => (
        <GraphTooltip style={{ whiteSpace: 'nowrap' }}>
          <GraphTooltipDate>{indexValue}</GraphTooltipDate>
          {!privacyMode && (
            <div>
              {formatFull(defaultCurrency, Math.abs(Number(value)), privacyMode)} {id}
            </div>
          )}
        </GraphTooltip>
      )}
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
      animate={false}
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
        .filter((tx) => tx.getType() === 'income')
        .filter((tx) => tx.date.getFullYear() === year && tx.date.getMonth() === m)
        .reduce((sum, tx) => {
          const rate =
            tx.receiverCurrencyId === defaultCurrency.id
              ? 1
              : exchangeRateOnDay(tx.receiverCurrencyId, defaultCurrency.id, tx.date)
          return sum + tx.receiverAmount * rate
        }, 0)

      // Outflow: money leaving my accounts to external
      const outflow = augmentedTransactions
        .filter((tx) => tx.getType() === 'expense')
        .filter((tx) => tx.date.getFullYear() === year && tx.date.getMonth() === m)
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

  const netWorthText = formatFull(defaultCurrency, netWorth, privacyMode)

  const hasTransactions = augmentedTransactions.length > 0
  const hasFinancialIncome = augmentedTransactions.some((t) => t.financialIncomeData !== null)
  const hasCashFlow = cashFlowData.some((d) => d.inflow !== 0 || d.outflow !== 0)

  return (
    <ContentWithHeader title="Dashboard" action="menu" withPadding withScrolling>
      <PageBody>
        {!hasTransactions && <GettingStarted />}
        {(hasTransactions || netWorth !== 0) && (
          <Section title="Net Worth">
            <Box sx={{ containerType: 'inline-size' }}>
              <Typography
                variant="hero"
                component="p"
                sx={(t) => ({
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  fontSize: `min(${t.typography.hero.fontSize}, ${(90 / (netWorthText.length * HERO_CHAR_WIDTH_EM)).toFixed(2)}cqi)`,
                })}
              >
                {netWorthText}
              </Typography>
            </Box>
          </Section>
        )}

        {hasFinancialIncome && (
          <Section title="Investments Performance">
            <Stack sx={{ height: '40vh' }}>
              <InvestmentGainLineChart fromDate={lastYear} toDate={today} />
            </Stack>
          </Section>
        )}

        {hasCashFlow && (
          <Section title="Cash Flow">
            <Stack spacing={2}>
              <Box sx={{ height: '40vh' }}>
                <CashFlowBarChart data={cashFlowData} />
              </Box>
              <Stack direction="row" justifyContent="space-around">
                <Stat label="Savings Rate" value={`${(savingsRate * 100).toFixed(1)}%`} />
                <Stat label="Surplus" value={formatFull(defaultCurrency, surplus, privacyMode)} />
              </Stack>
            </Stack>
          </Section>
        )}
      </PageBody>
    </ContentWithHeader>
  )
}

export default Dashboard
