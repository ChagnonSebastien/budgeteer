import { Box } from '@mui/material'
import { formatDate, min, startOfDay } from 'date-fns'
import React, { FC, Fragment, useContext, useMemo } from 'react'

import AreaChart, { Bucket, ColorReference, TooltipSlice } from './AreaChart'
import {
  GraphTooltip,
  GraphTooltipColor,
  GraphTooltipDate,
  GraphTooltipLabel,
  GraphTooltipRow,
  GraphTooltipValue,
  gainColor,
} from './GraphStyledComponents'
import { DateNavigation } from './TimerangeGraphUtils'
import Account from '../../domain/model/account'
import { CurrencyID, formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import useTimerangeSegmentation, { dateAxisLabels, TimeseriesIterator } from '../shared/useTimerangeSegmentation'

export type BaseLineConfig = 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
export type ScaleConfig = 'absolute' | 'cropped-absolute' | 'relative'

type GroupData = { bookValue: number; holdings: Map<string, { currencyId: CurrencyID; amount: number }> }

// Float leftovers from fractional units must not keep a sold-out group alive.
const EMPTY_HOLDING_TOLERANCE = 1e-9

const hold = (data: GroupData, accountId: number, currencyId: CurrencyID, delta: number) => {
  const key = `${accountId}-${currencyId}`
  const amount = (data.holdings.get(key)?.amount ?? 0) + delta
  if (Math.abs(amount) < EMPTY_HOLDING_TOLERANCE) data.holdings.delete(key)
  else data.holdings.set(key, { currencyId, amount })
}

const resetBookValueIfEmpty = (data: GroupData) => {
  if (data.holdings.size === 0) data.bookValue = 0
}

export const useNetWorthChartData = <Item extends object>(
  timeseriesIterator: TimeseriesIterator<AugmentedTransaction>,
  getInitialAmountIdentifier: (account: Account, currencyId: CurrencyID) => Item | undefined,
  getFromIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  getToIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  group: (account?: Item | undefined) => string | undefined,
  accounts: Account[],
  type: 'active' | 'passive' | 'all',
  getFinancialIncomeToIdentifierOverwrite?: (transaction: AugmentedTransaction) => Item | undefined,
) => {
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)

  const getFinancialIncomeToIdentifier = useMemo(
    () => getFinancialIncomeToIdentifierOverwrite ?? getToIdentifier,
    [getFinancialIncomeToIdentifierOverwrite, getToIdentifier],
  )

  return useMemo(() => {
    const accountIds = new Set(accounts.map((a) => a.id))
    const Investments = new Map<string, GroupData>()
    const groupData = (groupLabel: string) => {
      const existing = Investments.get(groupLabel)
      if (existing) return existing
      const created: GroupData = { bookValue: 0, holdings: new Map() }
      Investments.set(groupLabel, created)
      return created
    }
    const marketValueOn = (data: GroupData, upTo: Date) => {
      let marketValue = 0
      for (const { currencyId, amount } of data.holdings.values()) {
        let factor = 1
        if (currencyId !== defaultCurrency.id) {
          factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
        }
        marketValue += amount * factor
      }
      return marketValue
    }

    for (const account of accounts) {
      for (const initialAmount of account.initialAmounts) {
        const groupLabel = group(getInitialAmountIdentifier(account, initialAmount.currencyId))!
        hold(groupData(groupLabel), account.id, initialAmount.currencyId, initialAmount.value)
      }
    }

    const data: Bucket[] = []
    const labels: Date[] = []
    const groups = new Set<string>()

    let anchored = false
    for (const { items, upTo, section } of timeseriesIterator) {
      if (!anchored) {
        for (const transaction of items) {
          if (
            typeof transaction.receiver !== 'undefined' && // Has a Receiver
            transaction.receiver.isMine && // I am the receiver
            accountIds.has(transaction.receiver?.id ?? -1) // The account respects filters
          ) {
            const groupLabel = group(getToIdentifier(transaction))!
            hold(
              groupData(groupLabel),
              transaction.receiver.id,
              transaction.receiverCurrencyId,
              transaction.receiverAmount,
            )
          }
          if (
            typeof transaction.sender !== 'undefined' &&
            transaction.sender.isMine &&
            accountIds.has(transaction.sender?.id ?? -1)
          ) {
            const groupLabel = group(getFromIdentifier(transaction))!
            hold(groupData(groupLabel), transaction.sender.id, transaction.currencyId, -transaction.amount)
          }
        }

        for (const groupData of Investments.values()) {
          groupData.bookValue = marketValueOn(groupData, upTo)
        }

        if (section === 'before') continue
        anchored = true
      } else {
        for (const transaction of items) {
          if (
            typeof transaction.receiver !== 'undefined' && // Has a Receiver
            transaction.receiver.isMine && // I am the receiver
            accountIds.has(transaction.receiver?.id ?? -1) // The account respects filters
          ) {
            const groupLabel = group(getToIdentifier(transaction))!
            const data = groupData(groupLabel)
            hold(data, transaction.receiver.id, transaction.receiverCurrencyId, transaction.receiverAmount)

            if (
              !(
                typeof transaction.sender !== 'undefined' &&
                transaction.sender.isMine &&
                accountIds.has(transaction.sender?.id ?? -1) &&
                group(getFromIdentifier(transaction)) === groupLabel
              )
            ) {
              // I received it from someone else OR from myself with a category change
              // Update book value
              let bookValueChange
              if (transaction.receiverCurrencyId === defaultCurrency.id) {
                bookValueChange = transaction.receiverAmount
              } else if (transaction.currencyId === defaultCurrency.id) {
                bookValueChange = transaction.amount
              } else {
                const factor = exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency.id, upTo)
                bookValueChange = transaction.receiverAmount * factor
              }

              data.bookValue += bookValueChange
              if (transaction.getType() === 'financialIncome') {
                const financialGroupLabel = group(getFinancialIncomeToIdentifier(transaction))!
                if (financialGroupLabel === groupLabel) {
                  data.bookValue -= bookValueChange
                } else {
                  const financialData = groupData(financialGroupLabel)
                  financialData.bookValue -= bookValueChange
                  resetBookValueIfEmpty(financialData)
                }
              }
            }

            resetBookValueIfEmpty(data)
          }
          if (
            typeof transaction.sender !== 'undefined' && // Has a Sender
            transaction.sender.isMine && // I am the sender
            accountIds.has(transaction.sender?.id ?? -1) // The account respects filters
          ) {
            const groupLabel = group(getFromIdentifier(transaction))!
            const data = groupData(groupLabel)
            hold(data, transaction.sender.id, transaction.currencyId, -transaction.amount)

            if (
              !(
                (typeof transaction.receiver !== 'undefined' &&
                  transaction.receiver.isMine &&
                  accountIds.has(transaction.receiver?.id ?? -1) &&
                  group(getToIdentifier(transaction)) === groupLabel) ||
                transaction.getType() === 'financialIncome'
              )
            ) {
              // I did not receive it from myself without changing category and it is not a financial income
              // Update book value
              if (transaction.receiverCurrencyId === defaultCurrency.id) {
                data.bookValue -= transaction.receiverAmount
              } else if (transaction.currencyId === defaultCurrency.id) {
                data.bookValue -= transaction.amount
              } else {
                const factor = exchangeRateOnDay(transaction.currencyId, defaultCurrency.id, upTo)
                data.bookValue -= transaction.amount * factor
              }
            }

            resetBookValueIfEmpty(data)
          }
        }
      }

      const todaysData: { [account: string]: { amount: number; baseline?: number } } = {}
      let todaysBookValue = 0
      for (const [groupLabel, groupData] of Investments.entries()) {
        if (groupData.holdings.size === 0) continue
        const marketValue = marketValueOn(groupData, upTo)

        if (type === 'all' || marketValue >= 0 === (type === 'active')) {
          const optionalInverse = type === 'passive' ? -1 : 1
          todaysBookValue += groupData.bookValue * optionalInverse
          todaysData[groupLabel] = {
            amount: marketValue * optionalInverse,
            baseline: groupData.bookValue * optionalInverse,
          }
          groups.add(groupLabel)
        }
      }

      labels.push(upTo)
      data.push({ date: upTo, values: { ...todaysData }, baseline: todaysBookValue })
    }

    return { data, labels, groups }
  }, [
    defaultCurrency,
    accounts,
    group,
    exchangeRateOnDay,
    timeseriesIterator,
    type,
    getInitialAmountIdentifier,
    getFromIdentifier,
    getToIdentifier,
    getFinancialIncomeToIdentifier,
  ])
}

const sortGroups = (groups: Set<string>) => [...groups].sort((a, b) => b.localeCompare(a))

export const useBalanceChartData = <Item extends object>(
  fromDate: Date,
  toDate: Date,
  ...identifiers: Parameters<typeof useNetWorthChartData<Item>> extends [unknown, ...infer Rest] ? Rest : never
) => {
  const { augmentedTransactions } = useContext(MixedAugmentation)

  const { showLabelEveryFactor, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate, 'dense')
  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )
  const ranged = useNetWorthChartData(timeseriesIterator, ...identifiers)

  const todayTime = startOfDay(new Date()).getTime()
  const historyStartTime = min([startOfDay(augmentedTransactions.at(-1)?.date ?? todayTime), fromDate]).getTime()
  const today = useMemo(() => new Date(todayTime), [todayTime])
  const historyStart = useMemo(() => new Date(historyStartTime), [historyStartTime])
  const history = useTimerangeSegmentation(historyStart, today)
  const historyIterator = useMemo(
    () => history.timeseriesIteratorGenerator(augmentedTransactions),
    [history, augmentedTransactions],
  )
  const whole = useNetWorthChartData(historyIterator, ...identifiers)
  const colorReference = useMemo(() => ({ data: whole.data, labels: sortGroups(whole.groups) }), [whole])

  return { ...ranged, showLabelEveryFactor, colorReference }
}

const gainPercent = (gain: number, baseline: number | undefined) =>
  baseline ? `${gain >= 0 ? '+' : ''}${((gain / baseline) * 100).toFixed(1)}%` : '+0.0%'

type NetWorthTooltipProps = {
  tooltipProps: TooltipSlice
  labels: Date[]
  baselineConfig: BaseLineConfig
  scaleConfig: ScaleConfig
}

export const NetWorthTooltip: FC<NetWorthTooltipProps> = ({ tooltipProps, labels, baselineConfig, scaleConfig }) => {
  const { privacyMode } = useContext(DrawerContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')
  const totalGain = tooltipProps.slice.stack.map((s) => s.gain ?? 0).reduce((sum, g) => sum + g, 0)
  const totalBaseline = tooltipProps.slice.stack.map((s) => s.baseline ?? 0).reduce((sum, b) => sum + b, 0)
  const showGlobalGain = totalGain !== 0 && baselineConfig === 'showGlobalBaseline'
  const totalValue = tooltipProps.slice.stack.map((s) => s.value).reduce((sum, v) => sum + v, 0)

  return (
    <GraphTooltip>
      <GraphTooltipDate>{date}</GraphTooltipDate>

      <table>
        <tbody>
          {tooltipProps.slice.stack
            .filter((s) => s.value !== 0)
            .map((s) => {
              const showGain = s.gain !== 0 && baselineConfig === 'showIndividualBaselines'
              return (
                <Fragment key={`${date}-${s.layerLabel}`}>
                  {/* main row */}
                  <tr>
                    <td>
                      <GraphTooltipColor style={{ backgroundColor: s.color }} />
                    </td>
                    <td>
                      <GraphTooltipLabel>{s.layerLabel}</GraphTooltipLabel>
                    </td>

                    {!privacyMode && (
                      <Box component="td" sx={{ textAlign: 'end', pl: 2 }}>
                        <GraphTooltipValue>{s.formattedValue}</GraphTooltipValue>
                      </Box>
                    )}

                    {scaleConfig === 'relative' && (
                      <Box component="td" sx={{ textAlign: 'end', pl: 2 }}>
                        <GraphTooltipLabel>
                          {totalValue !== 0 ? `${((s.value / totalValue) * 100).toFixed(1)}%` : '0.0%'}
                        </GraphTooltipLabel>
                      </Box>
                    )}
                  </tr>

                  {/* indented gain row */}
                  {showGain && (
                    <tr>
                      <td />
                      <td />
                      {!privacyMode && (
                        <Box component="td" sx={{ textAlign: 'end' }}>
                          <Box component={GraphTooltipValue} sx={{ typography: 'caption', color: gainColor(s.gain) }}>
                            {s.gainFormatted}
                          </Box>
                        </Box>
                      )}
                      <Box component="td" sx={{ textAlign: 'end', pl: 2 }}>
                        <Box component={GraphTooltipValue} sx={{ color: gainColor(s.gain) }}>
                          {gainPercent(s.gain, s.baseline)}
                        </Box>
                      </Box>
                    </tr>
                  )}
                </Fragment>
              )
            })}
        </tbody>
      </table>

      {showGlobalGain && (
        <div>
          <hr />
          <GraphTooltipRow>
            <Box component={GraphTooltipValue} sx={{ color: gainColor(totalGain) }}>
              Total Gains: {!privacyMode && `${formatFull(defaultCurrency, totalGain)} `}
              {gainPercent(totalGain, totalBaseline)}
            </Box>
          </GraphTooltipRow>
        </div>
      )}
    </GraphTooltip>
  )
}

type NetWorthChartProps = {
  scale: ScaleConfig
  baselineConfig: BaseLineConfig
  groups: Set<string>
  labels: Date[]
  data: {
    date: Date
    baseline?: number
    values: {
      [p: string]: {
        amount: number
        baseline?: number
      }
    }
  }[]
  showLabelEveryFactor: number
  navigation?: DateNavigation
  colorReference?: ColorReference
  type: 'active' | 'passive'
}

const NetWorthChart: FC<NetWorthChartProps> = ({
  scale,
  groups,
  labels,
  data,
  baselineConfig,
  showLabelEveryFactor,
  navigation,
  colorReference,
  type,
}) => {
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  return useMemo(() => {
    let minYValue = 0
    if (scale === 'cropped-absolute' && groups.size === 1) {
      minYValue = Number.MAX_SAFE_INTEGER
      const groupLabel = [...groups.keys()][0]
      for (let i = 0; i < data.length; i += 1) {
        if (!data[i].values[groupLabel]) continue

        if (data[i].values[groupLabel].amount < minYValue) {
          minYValue = data[i].values[groupLabel].amount
        }
        if (
          baselineConfig == 'showIndividualBaselines' &&
          (data[i].values[groupLabel].baseline ?? Number.MAX_SAFE_INTEGER) < minYValue
        ) {
          minYValue = data[i].values[groupLabel].baseline!
        }
        if (baselineConfig == 'showGlobalBaseline' && (data[i].baseline ?? Number.MAX_SAFE_INTEGER) < minYValue) {
          minYValue = data[i].baseline!
        }
      }
    }

    const dateVisibility = dateAxisLabels(labels, showLabelEveryFactor)

    return (
      <AreaChart
        data={data}
        datasetsLabels={sortGroups(groups)}
        valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
        margin={{ top: 30, right: 25, bottom: 80, left: 60 }}
        showGlobalBaseline={baselineConfig === 'showGlobalBaseline'}
        showIndividualBaselines={baselineConfig === 'showIndividualBaselines'}
        minYValue={minYValue}
        xAxisConfig={{
          format: (date) => dateVisibility.get(date.getTime()) ?? '',
          tickSize: 5,
          tickPadding: 8,
        }}
        yAxisConfig={{
          grid: !privacyMode,
          tickSize: privacyMode ? 0 : 5,
          tickPadding: 5,
          format: (i) => {
            if (scale == 'relative') {
              return `${Math.round(i * 100)}%`
            }
            return privacyMode
              ? ''
              : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                  notation: 'compact',
                })
          },
        }}
        offsetType={scale == 'relative' ? 'expand' : 'normal'}
        colors={darkColors}
        navigation={navigation}
        colorReference={colorReference}
        emptyMessage={
          groups.size > 0 ? undefined : type === 'passive' ? 'No debts for this period' : 'No holdings for this period'
        }
        stackTooltip={(tooltipProps) => (
          <NetWorthTooltip
            tooltipProps={tooltipProps}
            labels={labels}
            baselineConfig={baselineConfig}
            scaleConfig={scale}
          />
        )}
      />
    )
  }, [
    baselineConfig,
    showLabelEveryFactor,
    data,
    labels,
    groups,
    scale,
    privacyMode,
    navigation,
    colorReference,
    type,
    defaultCurrency,
  ])
}

export default NetWorthChart
