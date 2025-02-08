import { differenceInMilliseconds, isBefore } from 'date-fns'
import { createContext, FC, useCallback, useContext, useMemo } from 'react'

import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from './ServiceContext'
import { ExchangeRate } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'

type CurrencyAmounts = Map<number, number>
type AccountBalances = Map<number, CurrencyAmounts>

type MixedAugmentationContext = {
  accountBalances: AccountBalances
  augmentedTransactions: AugmentedTransaction[]
  exchangeRates: Map<number, Map<number, ExchangeRate[]>>
  exchangeRateOnDay(from: number, to: number, date: Date): number
}

const MixedAugmentation = createContext<MixedAugmentationContext>({
  accountBalances: new Map(),
  augmentedTransactions: [],
  exchangeRates: new Map(),
  exchangeRateOnDay: (_from: number, _to: number, _date: Date) => 1,
})

export interface Props {
  children: JSX.Element
}

export const MixedAugmentationProvider: FC<Props> = ({ children }) => {
  const { state: transactions } = useContext(TransactionServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { augmentedCategories: categories } = useContext(CategoryServiceContext)
  const { state: accounts } = useContext(AccountServiceContext)

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
    return transactions.map<AugmentedTransaction>((transaction) => ({
      ...transaction,
      category: categories.find((c) => c.id === transaction.categoryId),
      currency: currencies.find((c) => c.id === transaction.currencyId)!,
      sender: accounts.find((c) => c.id === transaction.senderId),
      receiver: accounts.find((c) => c.id === transaction.receiverId),
      receiverCurrency: currencies.find((c) => c.id === transaction.receiverCurrencyId)!,
    }))
  }, [transactions, currencies, categories, accounts])

  const exchangeRates = useMemo(() => {
    const rates = new Map<number, Map<number, ExchangeRate[]>>()
    currencies.forEach((c) => {
      const comparedTo = new Map<number, ExchangeRate[]>()
      currencies.forEach((c2) => {
        comparedTo.set(c2.id, c.exchangeRates[c2.id] ?? [])
      })
      rates.set(c.id, comparedTo)
    })

    transactions.forEach((transaction) => {
      if (transaction.currencyId === transaction.receiverCurrencyId) return
      rates
        .get(transaction.currencyId)
        ?.get(transaction.receiverCurrencyId)
        ?.push(
          new ExchangeRate(
            transaction.receiverCurrencyId,
            transaction.receiverAmount / transaction.amount,
            transaction.date,
          ),
        )
      rates
        .get(transaction.receiverCurrencyId)
        ?.get(transaction.currencyId)
        ?.push(
          new ExchangeRate(transaction.currencyId, transaction.amount / transaction.receiverAmount, transaction.date),
        )
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
  }, [currencies, transactions])

  const exchangeRateOnDay = useCallback(
    (from: number, to: number, date: Date): number => {
      const specificRates = exchangeRates.get(from)!.get(to)!
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
    },
    [exchangeRates],
  )

  return (
    <MixedAugmentation.Provider value={{ accountBalances, augmentedTransactions, exchangeRates, exchangeRateOnDay }}>
      {children}
    </MixedAugmentation.Provider>
  )
}

export default MixedAugmentation
