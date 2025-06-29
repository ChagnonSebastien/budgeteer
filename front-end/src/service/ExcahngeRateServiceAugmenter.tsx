import { FC, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import ExchangeRate, { ExchangeRateId } from '../domain/model/exchangeRate'

export interface RateOnDate {
  rate: number
  date: Date
}

export interface ExchangeRatePersistenceAugmentation {
  exchangeRates: Map<number, Map<number, RateOnDate[]>>
}

export const addComparison = (
  rates: Map<number, Map<number, RateOnDate[]>>,
  from: number,
  to: number,
  rateOnDate: RateOnDate,
) => {
  let level1 = rates.get(from)
  if (typeof level1 === 'undefined') {
    level1 = new Map()
    rates.set(from, level1)
  }

  let level2 = level1.get(to)
  if (typeof level2 === 'undefined') {
    level2 = []
    level1.set(to, level2)
  }

  level2.push(rateOnDate)
}

export const ExchangeRatePersistenceAugmenter: FC<
  AugmenterProps<ExchangeRateId, ExchangeRate, ExchangeRatePersistenceAugmentation>
> = (props) => {
  const { augment, state } = props

  const exchangeRates = useMemo(() => {
    const rates = new Map<number, Map<number, RateOnDate[]>>()
    state.forEach((rate) => {
      addComparison(rates, rate.currencyA, rate.currencyB, { rate: rate.rate, date: rate.date })
      addComparison(rates, rate.currencyB, rate.currencyA, { rate: 1 / rate.rate, date: rate.date })
    })

    for (const specificRates of rates.values()) {
      for (const [child, list] of specificRates.entries()) {
        specificRates.set(
          child,
          list.sort((e1, e2) => e1.date.getTime() - e2.date.getTime()),
        )
      }
    }

    return rates
  }, [state])

  return augment({ exchangeRates })
}
