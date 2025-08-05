import { FC, useContext, useMemo } from 'react'

import LineChart, { Bucket } from './LineChart'
import Currency from '../../domain/model/currency'
import ExchangeRate, { ExchangeRateIdentifiableFields } from '../../domain/model/exchangeRate'
import MixedAugmentation from '../../service/MixedAugmentation'
import { darkColors } from '../../utils'

type Props = {
  currency: Currency
  against: Currency
}

const ExchangeRateHistory: FC<Props> = ({ currency, against }) => {
  const { exchangeRates, exchangeRateOnDay, augmentedTransactions } = useContext(MixedAugmentation)

  const monthlyRates = useMemo(() => {
    let rates = exchangeRates.get(currency.id)?.get(against.id)
    if (currency.id === against.id) {
      rates = [new ExchangeRate(new ExchangeRateIdentifiableFields(against.id, against.id, new Date()), 1)]
    }
    if (typeof rates === 'undefined' || rates.length === 0) return []

    let startDate = new Date(Math.min(...rates.map((r) => new Date(r.date).getTime())))
    if (currency.id === against.id) {
      startDate = augmentedTransactions[augmentedTransactions.length - 1].date
    }
    startDate.setDate(1)
    startDate.setHours(0, 0, 0, 0)

    const dataPoints: Bucket[] = []
    const currentDate = new Date()
    let currentMonth = new Date(startDate)

    while (currentMonth <= currentDate) {
      const closestRate = currency.id === against.id ? 1 : exchangeRateOnDay(currency.id, against.id, currentMonth)

      dataPoints.push({
        date: currentMonth,
        values: {
          Rate: {
            amount: closestRate * Math.pow(10, currency.decimalPoints - against.decimalPoints),
          },
        },
      })

      currentMonth = new Date(currentMonth.setMonth(currentMonth.getMonth() + 1))
    }

    return dataPoints
  }, [currency, against, exchangeRates, exchangeRateOnDay, augmentedTransactions])

  return (
    <LineChart
      margin={{ top: 0, right: 0, bottom: 30, left: 40 }}
      data={monthlyRates}
      xAxisConfig={{
        format: (date) => {
          if (date.getUTCMonth() === 0 && date.getDate() === 1) {
            return date.getUTCFullYear().toString()
          }
          return ''
        },
        grid: true,
      }}
      yAxisConfig={{
        grid: true,
      }}
      colors={darkColors}
    />
  )
}

export default ExchangeRateHistory
