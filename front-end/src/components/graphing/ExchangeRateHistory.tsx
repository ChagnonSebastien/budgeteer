import { formatDate, startOfDay, startOfMonth } from 'date-fns'
import { FC, useContext, useMemo } from 'react'

import LineChart, { Bucket } from './LineChart'
import Currency from '../../domain/model/currency'
import ExchangeRate, { ExchangeRateIdentifiableFields } from '../../domain/model/exchangeRate'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { darkColors } from '../../utils'
import useTimerangeSegmentation from '../shared/useTimerangeSegmentation'

type Props = {
  currency: Currency
  against: Currency
}

const ExchangeRateHistory: FC<Props> = ({ currency, against }) => {
  const { exchangeRates, exchangeRateOnDay, augmentedTransactions } = useContext(MixedAugmentation)
  const { myOwnAccounts } = useContext(AccountServiceContext)

  const rates =
    currency.id === against.id
      ? [new ExchangeRate(new ExchangeRateIdentifiableFields(against.id, against.id, new Date()), 1)]
      : exchangeRates.get(currency.id)?.get(against.id)
  const hasRates = typeof rates !== 'undefined' && rates.length > 0

  const endTime = startOfDay(new Date()).getTime()
  let startTime = endTime
  if (hasRates) {
    startTime = startOfDay(new Date(Math.min(...rates.map((r) => new Date(r.date).getTime())))).getTime()
    if (currency.id === against.id) {
      startTime = startOfDay(startOfMonth(augmentedTransactions.at(-1)?.date ?? startTime)).getTime()
    }
  }
  const startDate = useMemo(() => new Date(startTime), [startTime])
  const endDate = useMemo(() => new Date(endTime), [endTime])

  const { timeseriesIteratorGenerator, showLabelEveryFactor } = useTimerangeSegmentation(startDate, endDate, 'dense')

  const timeseriesIterator = useMemo(
    () => timeseriesIteratorGenerator(augmentedTransactions),
    [timeseriesIteratorGenerator, augmentedTransactions],
  )

  const data = useMemo(() => {
    if (!hasRates) return []

    let currentlyHeld = 0
    myOwnAccounts.forEach((account) => {
      for (const initialAmount of account.initialAmounts) {
        if (initialAmount.currencyId === currency.id) {
          currentlyHeld += initialAmount.value
        }
      }
    })

    let dividends = 1
    const initialRate = exchangeRateOnDay(currency.id, against.id, startDate)
    const data: Bucket[] = [{ date: startDate, values: { PercentageGain: { amount: 1 } } }]

    for (const { section, upTo, items } of timeseriesIterator) {
      if (section === 'before') {
        for (const transaction of items) {
          if (transaction.receiver?.isMine && transaction.receiverCurrencyId === currency.id) {
            currentlyHeld += transaction.receiverAmount
          }

          if (transaction.sender?.isMine && transaction.currencyId === currency.id) {
            currentlyHeld -= transaction.amount
          }
        }

        continue
      }

      for (const transaction of items) {
        if (transaction.receiver?.isMine && transaction.receiverCurrencyId === currency.id) {
          currentlyHeld += transaction.receiverAmount
        }

        if (transaction.sender?.isMine && transaction.currencyId === currency.id) {
          currentlyHeld -= transaction.amount
        }

        if (transaction.financialIncomeData?.relatedCurrencyId === currency.id && transaction.receiver?.isMine) {
          if (transaction.receiverCurrencyId === currency.id) {
            dividends *= (currentlyHeld - transaction.receiverAmount) / currentlyHeld
          } else if (transaction.currencyId === currency.id) {
            dividends *= (currentlyHeld - transaction.amount) / currentlyHeld
          } else {
            const factor = exchangeRateOnDay(transaction.receiverCurrencyId, currency.id, transaction.date)
            dividends *= (currentlyHeld - transaction.receiverAmount * factor) / currentlyHeld
          }
        }
      }

      const currentRate = exchangeRateOnDay(currency.id, against.id, upTo)
      const wouldBe = dividends * initialRate
      data.push({ date: upTo, values: { PercentageGain: { amount: currentRate / wouldBe } } })
    }

    return data
  }, [hasRates, currency.id, against.id, myOwnAccounts, exchangeRateOnDay, startDate, timeseriesIterator])

  if (!hasRates) return []

  const dateVisibility = data.reduce((map, bucket, i) => {
    if ((data.length - i - 1) % showLabelEveryFactor === 0) {
      map.set(bucket.date.getTime(), data[i].date && formatDate(data[i].date, 'MMM d, yyyy'))
    }
    return map
  }, new Map<number, string>())

  return (
    <LineChart
      margin={{ top: 0, right: 0, bottom: 60, left: 40 }}
      data={data}
      xAxisConfig={{
        format: (date) => dateVisibility.get(date.getTime()) ?? '',
        grid: true,
      }}
      yAxisConfig={{
        format: (n) => `${(n * 100 - 100).toFixed(0)}%`,
        grid: true,
        nice: true,
      }}
      colors={darkColors}
    />
  )
}

export default ExchangeRateHistory
