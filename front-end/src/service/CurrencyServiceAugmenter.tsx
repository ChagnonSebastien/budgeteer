import { FC, useCallback, useMemo } from "react"
import Currency, { ExchangeRate } from "../domain/model/currency"
import { AugmenterProps } from "./BasicCrudServiceWithPersistence"

export interface CurrencyPersistenceAugmentation {
  create(data: Omit<Currency, "id">): Promise<Currency>
}

export const CurrencyPersistenceAugmenter: FC<AugmenterProps<Currency, CurrencyPersistenceAugmentation>> = (props) => {
  const {augment, setState, longTermStore, sorter} = props

  const create = useCallback(async (data: Omit<Currency, "id">): Promise<Currency> => {
    const newItem = await longTermStore.create(data)

    const other = Object.keys(data.exchangeRates).map(Number).map(k => k as keyof typeof data.exchangeRates)
    setState(prevState => {
      let newState = prevState
      if (other.length > 0) {
        newState = prevState.map(prevItem => {
          if (prevItem.id !== other[0]) return prevItem

          let newExchangeRates = prevItem.exchangeRates
          newExchangeRates[newItem.id] = [new ExchangeRate(
            Object.keys(newItem.exchangeRates).map(Number)[0],
            1 / data.exchangeRates[other[0]][0].rate,
            data.exchangeRates[other[0]][0].date,
          )]
          return new Currency(prevItem.id, prevItem.name, prevItem.symbol, prevItem.decimalPoints, newExchangeRates)
        })
      }
      return ([...newState, newItem].sort(sorter ?? ((_a: Currency, _b: Currency) => 0)))
    })
    return newItem
  }, [])

  return augment({create})
}