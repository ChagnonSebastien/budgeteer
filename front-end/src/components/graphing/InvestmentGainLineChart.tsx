import { formatDate } from 'date-fns'
import React, { FC, useContext, useMemo } from 'react'

import { Tooltip } from './AggregatedDiffChart'
import { Bucket } from './AreaChart'
import LineChart, { Bucket as LineBucket } from './LineChart'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { darkColors } from '../../utils'
import { DrawerContext } from '../Menu'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

interface GainChartProps {
  fromDate: Date
  toDate: Date
}

const InvestmentGainLineChart: FC<GainChartProps> = ({ fromDate, toDate }) => {
  const { augmentedTransactions, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  const filteredAccounts = useMemo(() => {
    return myOwnAccounts.filter((a) => a.type !== 'Credit Card')
  }, [myOwnAccounts])

  const { hop: subN, amountHop, timeseriesIteratorGenerator } = useTimerangeSegmentation(fromDate, toDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const { data, labels, groups } = useMemo(() => {
    const groupLabel = 'Total'
    const Investments = filteredAccounts.reduce((totals, account) => {
      const groupData = totals.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
      for (const initialAmount of account.initialAmounts) {
        groupData.assets.set(
          initialAmount.currencyId,
          (groupData.assets.get(initialAmount.currencyId) ?? 0) + initialAmount.value,
        )
      }
      totals.set(groupLabel, groupData)
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
            filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
          ) {
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
            filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0
          ) {
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
          filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 // The account respects filters
        ) {
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(
            transaction.receiverCurrencyId,
            (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
          )

          if (
            !(
              (typeof transaction.sender !== 'undefined' &&
                transaction.sender.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0) ||
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
          filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0
        ) {
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0) ||
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
  }, [
    augmentedTransactions,
    filteredAccounts,
    exchangeRateOnDay,
    defaultCurrency,
    fromDate,
    toDate,
    subN,
    amountHop,
    timeseriesIterator,
  ])

  const gainSeries = useMemo<LineBucket[]>(
    () =>
      data.map((bucket, i) => ({
        date: labels[i],
        values: Object.keys(bucket.values).reduce<
          Record<
            string,
            {
              amount: number
            }
          >
        >((prev, key) => {
          const { amount, baseline = 0 } = bucket.values[key] || { amount: 0, baseline: 0 }
          prev[key] = { amount: amount - baseline }
          return prev
        }, {}),
      })),
    [data, labels, groups],
  )

  return (
    <LineChart
      data={gainSeries}
      valueFormat={(value) => `${formatFull(defaultCurrency, value, privacyMode)}`}
      margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
      axisBottom={{
        format: (i) => ((data.length - i - 1) % 73 === 0 ? labels[i] && formatDate(labels[i], 'MMM d, yyyy') : ''),
      }}
      enableGridY={!privacyMode}
      axisLeft={{
        tickSize: privacyMode ? 0 : 5,
        format: (i) =>
          privacyMode
            ? ''
            : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
      }}
      colors={darkColors}
      stackTooltip={(tooltipProps) => <Tooltip tooltipProps={tooltipProps} labels={labels} />}
    />
  )
}

export default InvestmentGainLineChart
