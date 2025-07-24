import { Card } from '@mui/material'
import { ResponsiveLine } from '@nivo/line'
import {
  differenceInDays,
  differenceInMonths,
  differenceInWeeks,
  formatDate,
  isBefore,
  isSameDay,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { darkColors, darkTheme } from '../../utils'
import { DrawerContext } from '../Menu'

interface GainChartProps {
  fromDate: Date
  toDate: Date
}

const InvestmentGainLineChart: FC<GainChartProps> = ({ fromDate, toDate }) => {
  const { augmentedTransactions, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  const { privacyMode } = useContext(DrawerContext)

  // 1) filter your accounts exactly as you do elsewhere
  const filteredAccounts = useMemo(() => {
    return myOwnAccounts.filter((a) => a.type !== 'Credit Card')
  }, [myOwnAccounts])

  // 2) roll your balances forward to build up `data[]`, `labels[]` and `groups`
  const { data, labels, groups } = useMemo(() => {
    const diffDays = differenceInDays(toDate, fromDate)
    const diffWeeks = differenceInWeeks(toDate, fromDate)
    const diffMonths = differenceInMonths(toDate, fromDate)

    let subN = subDays
    let i = diffDays + 1

    if (diffMonths > 5 * 12) {
      // above 5 years
      subN = subMonths
      i = diffMonths
    } else if (diffMonths > 4 * 12) {
      // between 4 year and 5 years
      subN = subWeeks
      i = diffWeeks
    } else if (diffMonths > 3 * 12) {
      // between 3 year and 4 years
      subN = (date, i) => subWeeks(date, i * 2)
      i = Math.floor(diffWeeks / 2) + 1
    } else if (diffMonths > 2 * 12) {
      // between 2 year and 3 years
      subN = subWeeks
      i = diffWeeks
    } else if (diffMonths > 12) {
      // between 1 year and 2 years
      subN = subWeeks
      i = diffWeeks
    } else if (diffWeeks > 6 * 4) {
      // between 6 months and 1 year
      subN = subDays
      i = diffDays
    } else if (diffDays > 60) {
      // between 2 months and 6 months
      subN = subDays
      i = diffDays
    }

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

    let upTo = subN(toDate, i + 1)
    let t = augmentedTransactions.length - 1
    while (
      t >= 0 &&
      (isBefore(augmentedTransactions[t].date, upTo) || isSameDay(augmentedTransactions[t].date, upTo))
    ) {
      const transaction = augmentedTransactions[t]

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

      t -= 1
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

    const data: { baseline?: number; values: { [account: string]: { amount: number; baseline?: number } } }[] = []
    const labels: Date[] = []
    const groups = new Set<string>()

    while (i >= 0) {
      upTo = subN(toDate, i)

      while (
        t >= 0 &&
        (isBefore(augmentedTransactions[t].date, upTo) || isSameDay(augmentedTransactions[t].date, upTo))
      ) {
        const transaction = augmentedTransactions[t]

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

        t -= 1
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
      i -= 1
    }

    return { data, labels, groups }
  }, [augmentedTransactions, filteredAccounts, exchangeRateOnDay, defaultCurrency, fromDate, toDate])

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
      margin={{ top: 20, right: 50, bottom: 50, left: 60 }}
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
