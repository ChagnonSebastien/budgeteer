import { Card } from '@mui/material'
import { ResponsiveLine } from '@nivo/line'
import { formatDate } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { darkColors, darkTheme } from '../../utils'
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
    const Investments = filteredAccounts.reduce((totals, account) => {
      const groupLabel = 'Total'
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

    const data: { baseline?: number; values: { [account: string]: { amount: number; baseline?: number } } }[] = []
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
            const groupLabel = 'Total'
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
            const groupLabel = 'Total'
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
          const groupLabel = 'Total'
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(
            transaction.receiverCurrencyId,
            (data.assets.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
          )

          if (
            !(
              (typeof transaction.sender !== 'undefined' &&
                transaction.sender.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.sender?.id) >= 0 &&
                'Total' === groupLabel) ||
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
          const groupLabel = 'Total'
          const data = Investments.get(groupLabel) ?? { bookValue: 0, assets: new Map() }
          data.assets.set(transaction.currencyId, (data.assets.get(transaction.currencyId) ?? 0) - transaction.amount)

          if (
            !(
              (typeof transaction.receiver !== 'undefined' &&
                transaction.receiver.isMine &&
                filteredAccounts.findIndex((a) => a.id === transaction.receiver?.id) >= 0 &&
                'Total' === groupLabel) ||
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
      data.push({ values: { ...todaysData }, baseline: todaysBookValue })
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

  // 3) turn that into a Nivo‐friendly “gain above baseline” series
  const gainSeries = useMemo(
    () =>
      Array.from(groups).map((groupLabel) => ({
        id: groupLabel,
        data: labels.map((date, idx) => {
          const { amount, baseline = 0 } = data[idx].values[groupLabel] || { amount: 0, baseline: 0 }
          return {
            x: date,
            y: amount - baseline,
          }
        }),
      })),
    [data, labels, groups],
  )

  return (
    <ResponsiveLine
      data={gainSeries}
      animate={false}
      margin={{ top: 20, right: 20, bottom: 50, left: 50 }}
      xScale={{ type: 'time', format: 'native', precision: 'day' }}
      yScale={{ type: 'linear', min: 'auto' }}
      xFormat={(i) => formatDate(i, 'MMM d, yyyy')}
      yFormat={(i) => formatFull(defaultCurrency, i as number, privacyMode)}
      axisBottom={{
        format: (i) => formatDate(i, 'MMM d, yy'),
        tickRotation: -45,
      }}
      axisLeft={{
        tickSize: privacyMode ? 0 : 5,
        format: (i) =>
          privacyMode
            ? ''
            : ((i as number) / Math.pow(10, defaultCurrency.decimalPoints)).toLocaleString(undefined, {
                notation: 'compact',
              }),
      }}
      curve="monotoneX"
      useMesh={true}
      enablePoints={false}
      theme={darkTheme}
      colors={darkColors}
      tooltip={(props) => {
        return (
          <Card>
            <div className="p-2 flex flex-col items-center">
              <div className="font-bold">{props.point.data.xFormatted}</div>
              {!privacyMode && <div>{props.point.data.yFormatted}</div>}
            </div>
          </Card>
        )
      }}
    />
  )
}

export default InvestmentGainLineChart
