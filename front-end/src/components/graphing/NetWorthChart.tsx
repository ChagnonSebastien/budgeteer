import { useTheme } from '@mui/material'
import { formatDate } from 'date-fns'
import React, { FC, useContext, useMemo } from 'react'

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
import { formatFull } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import { TimeseriesIterator } from '../shared/useTimerangeSegmentation'

export type BaseLineConfig = 'none' | 'showIndividualBaselines' | 'showGlobalBaseline'
export type ScaleConfig = 'absolute' | 'cropped-absolute' | 'relative'

export const useNetWorthChartData = <Item extends object>(
  timeseriesIterator: TimeseriesIterator<AugmentedTransaction>,
  computeInitialInvestments: () => Map<string, { bookValue: number; assets: Map<number, number> }>,
  getFromIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  getToIdentifier: (transaction: AugmentedTransaction) => Item | undefined,
  group: (account?: Item | undefined) => string | undefined,
  accounts: Account[],
) => {
  const { exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)

  return useMemo(() => {
    const Investments = computeInitialInvestments()

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
              (typeof transaction.sender !== 'undefined' &&
                transaction.sender.isMine &&
                accounts.findIndex((a) => a.id === transaction.sender?.id) >= 0 &&
                group(getFromIdentifier(transaction)) === groupLabel) ||
              transaction.category?.name === 'Financial income'
            )
          ) {
            if (transaction.receiverCurrencyId === defaultCurrency.id) {
              data.bookValue += transaction.receiverAmount
            } else if (transaction.currencyId === defaultCurrency.id) {
              data.bookValue += transaction.amount
            } else {
              const factor = exchangeRateOnDay(transaction.receiverCurrencyId, defaultCurrency.id, upTo)
              data.bookValue += transaction.receiverAmount * factor
            }
          }

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

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                accounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 &&
                group(getToIdentifier(transaction)) === groupLabel) ||
              transaction.category?.name === 'Financial income'
            )
          ) {
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

        todaysBookValue += groupData.bookValue
        todaysData[groupLabel] = { amount: marketValue, baseline: groupData.bookValue }
        groups.add(groupLabel)
      }

      labels.push(upTo)
      data.push({ date: upTo, values: { ...todaysData }, baseline: todaysBookValue })
    }

    return { data, labels, groups }
  }, [defaultCurrency, accounts, group, exchangeRateOnDay, timeseriesIterator])
}

type NetWorthTooltipProps = {
  tooltipProps: TooltipSlice
  labels: Date[]
  baselineConfig: BaseLineConfig
}

export const NetWorthTooltip: FC<NetWorthTooltipProps> = ({ tooltipProps, labels, baselineConfig }) => {
  const theme = useTheme()
  const { privacyMode } = useContext(DrawerContext)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const date = formatDate(labels[tooltipProps.slice.index], 'MMM d, yyyy')
  const totalGain = tooltipProps.slice.stack.map((s) => s.gain ?? 0).reduce((sum, g) => sum + g, 0)
  const showGlobalGain = !privacyMode && totalGain !== 0 && baselineConfig === 'showGlobalBaseline'

  return (
    <GraphTooltip>
      <GraphTooltipDate>{date}</GraphTooltipDate>

      {tooltipProps.slice.stack
        .filter((s) => s.value !== 0)
        .map((s) => {
          const showGain = !privacyMode && s.gain !== 0 && baselineConfig === 'showIndividualBaselines'
          return (
            <div key={`${date}-${s.layerLabel}`}>
              {/* main row */}
              <GraphTooltipRow>
                <GraphTooltipColor style={{ backgroundColor: s.color }} />
                <GraphTooltipLabel>{s.layerLabel}</GraphTooltipLabel>

                {!privacyMode && (
                  <>
                    <div>:</div>
                    <div style={{ minWidth: '1rem', flexGrow: 1 }} />
                    <GraphTooltipValue>{s.formattedValue}</GraphTooltipValue>
                  </>
                )}
              </GraphTooltipRow>

              {/* indented gain row */}
              {showGain && (
                <GraphTooltipRow>
                  <GraphTooltipValue
                    style={{
                      fontSize: 'small',
                      color: s.gain < 0 ? theme.palette.error.light : theme.palette.success.light,
                    }}
                  >
                    {s.gainFormatted}
                  </GraphTooltipValue>
                </GraphTooltipRow>
              )}
            </div>
          )
        })}

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
          grid: true,
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
          <NetWorthTooltip tooltipProps={tooltipProps} labels={labels} baselineConfig={baselineConfig} />
        )}
      />
    )
  }, [baselineConfig, showLabelEveryFactor, data, labels, groups, scale, privacyMode])
}

export default NetWorthChart
