import { differenceInMilliseconds, isBefore } from 'date-fns'
import React, { createContext, FC, useContext, useMemo } from 'react'

import { addComparison, RateOnDate } from './ExcahngeRateServiceAugmenter'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  TransactionServiceContext,
} from './ServiceContext'
import LoadingScreen from '../components/LoadingScreen'
import Category from '../domain/model/category'
import Currency, { RateAutoupdateSettings } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'

type CurrencyAmounts = Map<number, number>
type AccountBalances = Map<number, CurrencyAmounts>

type MixedAugmentationContext = {
  accountBalances: AccountBalances
  augmentedTransactions: AugmentedTransaction[]
  exchangeRates: Map<number, Map<number, RateOnDate[]>>
  exchangeRateOnDay(from: number, to: number, date: Date): number
  defaultCurrency: Currency
  rootCategory: Category
}

const MixedAugmentation = createContext<MixedAugmentationContext>({
  accountBalances: new Map(),
  augmentedTransactions: [],
  exchangeRates: new Map(),
  exchangeRateOnDay: (_from: number, _to: number, _date: Date) => 1,
  defaultCurrency: new Currency(0, 'zero', '.', 0, new RateAutoupdateSettings('', false)),
  rootCategory: new Category(0, 'zero', '', '', '', null, false, 0),
})

export interface Props {
  NextComponent: FC
}

export const MixedAugmentationProvider: FC<Props> = ({ NextComponent }) => {
  const { state: transactions } = useContext(TransactionServiceContext)
  const { state: currencies, tentativeDefaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedCategories: categories, tentativeRoot } = useContext(CategoryServiceContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { exchangeRates: rawExchangeRates } = useContext(ExchangeRateServiceContext)

  const accountBalances = useMemo(() => {
    const accountAmounts = new Map<number, Map<number, number>>()

    for (const account of accounts) {
      const initialAmounts = new Map()
      for (const balance of account.initialAmounts) {
        initialAmounts.set(balance.currencyId, balance.value)
      }
      accountAmounts.set(account.id, initialAmounts)
    }

    for (const transaction of transactions) {
      if (transaction.senderId) {
        let currencyMap = accountAmounts.get(transaction.senderId)
        if (!currencyMap) {
          currencyMap = new Map()
          accountAmounts.set(transaction.senderId, currencyMap)
        }

        currencyMap.set(transaction.currencyId, (currencyMap.get(transaction.currencyId) ?? 0) - transaction.amount)
      }

      if (transaction.receiverId) {
        let currencyMap = accountAmounts.get(transaction.receiverId)
        if (!currencyMap) {
          currencyMap = new Map()
          accountAmounts.set(transaction.receiverId, currencyMap)
        }
        currencyMap.set(
          transaction.receiverCurrencyId,
          (currencyMap.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
        )
      }
    }

    return accountAmounts
  }, [accounts, transactions])

  const augmentedTransactions = useMemo<AugmentedTransaction[]>(() => {
    return transactions.map<AugmentedTransaction>(
      (transaction) =>
        new AugmentedTransaction(
          transaction,
          currencies.find((c) => c.id === transaction.currencyId)!,
          currencies.find((c) => c.id === transaction.receiverCurrencyId)!,
          categories.find((c) => c.id === transaction.categoryId),
          accounts.find((c) => c.id === transaction.senderId),
          accounts.find((c) => c.id === transaction.receiverId),
        ),
    )
  }, [transactions, currencies, categories, accounts])

  const augmentedData = useMemo(() => {
    const exchangeRates = new Map<number, Map<number, RateOnDate[]>>()
    rawExchangeRates.forEach((value, key) => {
      const level1 = new Map()
      exchangeRates.set(key, level1)
      value.forEach((data, key2) => {
        level1.set(key2, [...data])
      })
    })

    transactions.forEach((transaction) => {
      if (transaction.currencyId === transaction.receiverCurrencyId) return
      addComparison(exchangeRates, transaction.currencyId, transaction.receiverCurrencyId, {
        rate: transaction.receiverAmount / transaction.amount,
        date: transaction.date,
      })
      addComparison(exchangeRates, transaction.receiverCurrencyId, transaction.currencyId, {
        rate: transaction.amount / transaction.receiverAmount,
        date: transaction.date,
      })
    })

    for (const specificRates of exchangeRates.values()) {
      for (const [child, list] of specificRates.entries()) {
        specificRates.set(
          child,
          list.sort((e1, e2) => e1.date.getTime() - e2.date.getTime()),
        )
      }
    }

    const exchangeRateOnDay = (from: number, to: number, date: Date): number => {
      const specificRates = exchangeRates.get(from)?.get(to)
      if (typeof specificRates === 'undefined') {
        return 1
      }

      let beforeIndex = specificRates.findLastIndex((r) => isBefore(r.date, date))
      let afterIndex = beforeIndex + 1
      if (beforeIndex === -1) beforeIndex = 0
      if (afterIndex === specificRates.length) afterIndex -= 1
      const before = specificRates[beforeIndex]
      const after = specificRates[afterIndex]
      const ratio =
        beforeIndex === afterIndex
          ? 1
          : differenceInMilliseconds(before.date, date) / differenceInMilliseconds(before.date, after.date)
      return after.rate * ratio + before.rate * (1 - ratio)
    }

    return { exchangeRates, exchangeRateOnDay }
  }, [rawExchangeRates, transactions])

  if (tentativeRoot === null || tentativeDefaultCurrency === null) {
    return <LoadingScreen />
  }

  return (
    <MixedAugmentation.Provider
      value={{
        rootCategory: tentativeRoot,
        defaultCurrency: tentativeDefaultCurrency,
        accountBalances,
        augmentedTransactions,
        ...augmentedData,
      }}
    >
      <NextComponent />
    </MixedAugmentation.Provider>
  )
}

export default MixedAugmentation
