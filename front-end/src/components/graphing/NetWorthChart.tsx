import { useTheme } from '@mui/material'
import { formatDate } from 'date-fns'
import React, { FC, Fragment, useContext, useMemo } from 'react'

import AreaChart, { Bucket, TooltipSlice } from './AreaChart'
import {
  GraphTooltip,
  GraphTooltipColor,
  GraphTooltipDate,
  GraphTooltipLabel,
  GraphTooltipRow,
  GraphTooltipValue,
} from './GraphStyledComponents'
import Account from '../../domain/model/account'
import { CurrencyID, formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import { TimeseriesIterator } from '../shared/useTimerangeSegmentation'

export type BaseLineConfig = 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
export type ScaleConfig = 'absolute' | 'cropped-absolute' | 'relative'

const shortenLabel = (label: string, maxLength: number = 25): string => {
  if (label.length <= maxLength) return label
  const charsToKeep = Math.floor((maxLength - 3) / 2) // Reserve 3 chars for "..."
  return `${label.slice(0, charsToKeep)}...${label.slice(-charsToKeep)}`
}

export const useNetWorthChartData = <Item extends object>(
  timeseriesIterator: TimeseriesIterator<AugmentedTransaction>,
  getInitialAmountIdentifier: (account: Account, currencyId: CurrencyID) => Item | undefined,
  getFromIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  getToIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  group: (account?: Item | undefined) => string | undefined,
  accounts: Account[],
  type: 'active' | 'passive',
  getFinancialIncomeToIdentifierOverwrite?: (transaction: AugmentedTransaction) => Item | undefined,
) => {
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)

  const getFinancialIncomeToIdentifier = useMemo(
    () => getFinancialIncomeToIdentifierOverwrite ?? getToIdentifier,
    [getFinancialIncomeToIdentifierOverwrite, getToIdentifier],
  )

  return useMemo(() => {
    const Investments = accounts.reduce((totals, account) => {
      for (const initialAmount of account.initialAmounts) {
        const groupLabel = group(getInitialAmountIdentifier(account, initialAmount.currencyId))!
        const groupData = totals.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
        groupData.assets.set(
          initialAmount.currencyId,
          (groupData.assets.get(initialAmount.currencyId) ?? 0) + initialAmount.value,
        )
        totals.set(groupLabel, groupData)
      }
      return totals
    }, new Map<string, { bookValue: number; assets: Map<number, number> }>())

    const data: Bucket[] = []
    const labels: Date[] = []
    const groups = new Set<string>()

    for (const { items, upTo, section } of timeseriesIterator) {
      if (section === 'before') {
        for (const transaction of items) {
          if (
            typeof transaction.receiver !== 'undefined' && // Has a Receiver
            transaction.receiver.isMine && // I am the receiver
            accounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
          ) {
            const groupLabel = group(getToIdentifier(transaction))!
            const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
            data.assets.set(
              transaction.receiverCurrencyId,
              (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
            )
            Investments.set(groupLabel, data)
          }
          if (
            typeof transaction.sender !== 'undefined' &&
            transaction.sender.isMine &&
            accounts.findIndex((a) => a.id === transaction.sender?.id) >= 0
          ) {
            const groupLabel = group(getFromIdentifier(transaction))!
            const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
            data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)
            Investments.set(groupLabel, data)
          }
        }

        for (const groupData of Investments.values()) {
          let marketValue = 0
          for (const [currencyId, amount] of groupData.assets) {
            let factor = 1
            if (currencyId !== defaultCurrency.id) {
              factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
            }
            marketValue += amount * factor
          }
          groupData.bookValue = marketValue
        }

        continue
      }

      for (const transaction of items) {
        if (
          typeof transaction.receiver !== 'undefined' && // Has a Receiver
          transaction.receiver.isMine && // I am the receiver
          accounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
        ) {
          const groupLabel = group(getToIdentifier(transaction))!
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(
            transaction.receiverCurrencyId,
            (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
          )

          if (
            !(
              typeof transaction.sender !== 'undefined' &&
              transaction.sender.isMine &&
              accounts.findIndex((a) => a.id === transaction.sender?.id) >= 0 &&
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
                const financialData = Investments.get(financialGroupLabel) ?? { bookValue: 0, assets: new Map() }
                financialData.bookValue -= bookValueChange
                Investments.set(financialGroupLabel, financialData)
              }
            }
          }

          Investments.set(groupLabel, data)
        }
        if (
          typeof transaction.sender !== 'undefined' && // Has a Sender
          transaction.sender.isMine && // I am the sender
          accounts.findIndex((a) => a.id === transaction.sender?.id) >= 0 // The account respects filters
        ) {
          const groupLabel = group(getFromIdentifier(transaction))!
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                accounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 &&
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

          Investments.set(groupLabel, data)
        }
      }

      const todaysData: { [account: string]: { amount: number; baseline?: number } } = {}
      let todaysBookValue = 0
      for (const [groupLabel, groupData] of Investments.entries()) {
        let marketValue = 0
        for (const [currencyId, amount] of groupData.assets) {
          let factor = 1
          if (currencyId !== defaultCurrency.id) {
            factor = exchangeRateOnDay(currencyId, defaultCurrency.id, upTo)
          }
          marketValue += amount * factor
        }

        if (marketValue !== 0 && marketValue > 0 === (type === 'active')) {
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
  }, [defaultCurrency, accounts, group, exchangeRateOnDay, timeseriesIterator, type])
}

type NetWorthTooltipProps = {
  tooltipProps: TooltipSlice
  labels: Date[]
  baselineConfig: BaseLineConfig
  scaleConfig: ScaleConfig
}

export const NetWorthTooltip: FC<NetWorthTooltipProps> = ({ tooltipProps, labels, baselineConfig, scaleConfig }) => {
  const theme = useTheme()
  const { privacyMode } = useContext(DrawerContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')
  const totalGain = tooltipProps.slice.stack.map((s) => s.gain ?? 0).reduce((sum, g) => sum + g, 0)
  const showGlobalGain = !privacyMode && totalGain !== 0 && baselineConfig === 'showGlobalBaseline'
  const totalValue = tooltipProps.slice.stack.map((s) => s.value).reduce((sum, v) => sum + v, 0)

  return (
    <GraphTooltip>
      <GraphTooltipDate>{date}</GraphTooltipDate>

      <table>
        {tooltipProps.slice.stack
          .filter((s) => s.value !== 0)
          .map((s) => {
            const showGain = !privacyMode && s.gain !== 0 && baselineConfig === 'showIndividualBaselines'
            return (
              <Fragment key={`${date}-${s.layerLabel}`}>
                {/* main row */}
                <tr>
                  <td>
                    <GraphTooltipColor style={{ backgroundColor: s.color }} />
                  </td>
                  <td>
                    <GraphTooltipLabel>{shortenLabel(s.layerLabel)}</GraphTooltipLabel>
                  </td>

                  {!privacyMode && (
                    <td style={{ textAlign: 'end', paddingLeft: '1rem' }}>
                      <GraphTooltipValue>{s.formattedValue}</GraphTooltipValue>
                    </td>
                  )}

                  {scaleConfig === 'relative' && (
                    <td style={{ paddingLeft: '1rem', textAlign: 'end' }}>
                      <GraphTooltipLabel>
                        {totalValue !== 0 ? `${((s.value / totalValue) * 100).toFixed(1)}%` : '0.0%'}
                      </GraphTooltipLabel>
                    </td>
                  )}
                </tr>

                {/* indented gain row */}
                {showGain && (
                  <tr>
                    <td />
                    <td />
                    <td style={{ textAlign: 'end' }}>
                      <GraphTooltipValue
                        style={{
                          fontSize: 'small',
                          color: s.gain < 0 ? theme.palette.error.light : theme.palette.success.light,
                        }}
                      >
                        {s.gainFormatted}
                      </GraphTooltipValue>
                    </td>

                    {scaleConfig === 'relative' && (
                      <td style={{ paddingLeft: '1rem', textAlign: 'end' }}>
                        <GraphTooltipValue
                          style={{ color: s.gain < 0 ? theme.palette.error.light : theme.palette.success.light }}
                        >
                          {s.baseline !== undefined && s.baseline !== 0
                            ? `${s.gain >= 0 ? '+' : ''}${((s.gain / s.baseline) * 100).toFixed(1)}%`
                            : '+0.0%'}
                        </GraphTooltipValue>
                      </td>
                    )}
                  </tr>
                )}
              </Fragment>
            )
          })}
      </table>

      {showGlobalGain && (
        <div>
          <hr />
          <GraphTooltipRow>
            <GraphTooltipValue
              style={{
                color: totalGain < 0 ? theme.palette.error.light : theme.palette.success.light,
              }}
            >
              Total Gains: {formatFull(defaultCurrency, totalGain, privacyMode)}
            </GraphTooltipValue>
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
}

const NetWorthChart: FC<NetWorthChartProps> = ({
  scale,
  groups,
  labels,
  data,
  baselineConfig,
  showLabelEveryFactor,
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

    const dateVisibility = data.reduce((map, bucket, i) => {
      if ((data.length - i - 1) % showLabelEveryFactor === 0) {
        map.set(bucket.date.getTime(), labels[i] && formatDate(labels[i], 'MMM d, yyyy'))
      }
      return map
    }, new Map<number, string>())

    return (
      <AreaChart
        data={data}
        datasetsLabels={[...groups.keys()].sort((a, b) => b.localeCompare(a))}
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
  }, [baselineConfig, showLabelEveryFactor, data, labels, groups, scale, privacyMode])
}

export default NetWorthChart
