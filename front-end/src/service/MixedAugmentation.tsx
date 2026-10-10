import React, { createContext, FC, useContext, useMemo } from 'react'

import { addComparison, RateOnDate } from './ExcahngeRateServiceAugmenter'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  SettlementServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
} from './ServiceContext'
import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import Category from '../domain/model/category'
import Currency, { RateAutoupdateSettings } from '../domain/model/currency'
import {
  AugmentedFinancialIncomeData,
  AugmentedTransaction,
  AugmentedTransactionGroupData,
} from '../domain/model/transaction'
import { AugmentedTransactionGroup } from '../domain/model/transactionGroup'

type CurrencyAmounts = Map<number, number>
type AccountBalances = Map<number, CurrencyAmounts>

type MixedAugmentationContext = {
  accountBalances: AccountBalances
  augmentedTransactionGroups: AugmentedTransactionGroup[]
  augmentedTransactions: AugmentedTransaction[]
  augmentedTransactionsFromGroupMembers: AugmentedTransaction[]
  exchangeRates: Map<number, Map<number, RateOnDate[]>>
  exchangeRateOnDay(from: number, to: number, date: Date): number
  defaultCurrency: Currency
  rootCategory: Category
}

const MixedAugmentation = createContext<MixedAugmentationContext>({
  accountBalances: new Map(),
  augmentedTransactions: [],
  augmentedTransactionsFromGroupMembers: [],
  augmentedTransactionGroups: [],
  exchangeRates: new Map(),
  exchangeRateOnDay: (_from: number, _to: number, _date: Date) => 1,
  defaultCurrency: new Currency(0, 'zero', '', '', '.', 0, new RateAutoupdateSettings('', false)),
  rootCategory: new Category(0, 'zero', '', '', '', null, false, 0),
})

export interface Props {
  NextComponent: FC
}

export const MixedAugmentationProvider: FC<Props> = ({ NextComponent }) => {
  const { email } = useContext(UserContext)
  const { state: transactions, transactionsFromGroupMembers } = useContext(TransactionServiceContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { state: currencies, tentativeDefaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedCategories: categories, tentativeRoot } = useContext(CategoryServiceContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { exchangeRates: rawExchangeRates } = useContext(ExchangeRateServiceContext)
  const { state: settlements } = useContext(SettlementServiceContext)

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

  const augmentedTransactionGroups = useMemo(() => {
    return transactionGroups
      .map((transactionGroup) => {
        if (!transactionGroup.hasJoined(email)) return null

        const currency = currencies.find((c) => c.id === transactionGroup.currency) ?? null
        const category = categories.find((c) => c.id === transactionGroup.category) ?? null

        if (currency === null || category === null) {
          return null
        }

        return new AugmentedTransactionGroup(transactionGroup, currency, category)
      })
      .filter((atg) => atg !== null)
  }, [transactionGroups, categories, currencies])

  const augmentedTransactions = useMemo<AugmentedTransaction[]>(() => {
    const currencyById = new Map(currencies.map((c) => [c.id, c]))
    const categoryById = new Map(categories.map((c) => [c.id, c]))
    const accountById = new Map(accounts.map((a) => [a.id, a]))
    const groupById = new Map(augmentedTransactionGroups.map((tg) => [tg.id, tg]))
    const settlementGroups = new Map<number, AugmentedTransactionGroup>()
    for (const settlement of settlements) {
      const group = groupById.get(settlement.transactionGroupId)
      if (settlement.ownTransactionId !== null && group) settlementGroups.set(settlement.ownTransactionId, group)
    }

    return transactions.map<AugmentedTransaction>((transaction) => {
      let augmentedFinancialIncomeData = null
      if (transaction.financialIncomeData !== null) {
        augmentedFinancialIncomeData = new AugmentedFinancialIncomeData(
          transaction.financialIncomeData,
          currencyById.get(transaction.financialIncomeData.relatedCurrencyId)!,
        )
      }

      let augmentedTransactionGroupData = null
      if (transaction.transactionGroupData !== null) {
        augmentedTransactionGroupData = new AugmentedTransactionGroupData(
          transaction.transactionGroupData,
          groupById.get(transaction.transactionGroupData.transactionGroupId)!,
        )
      }

      return new AugmentedTransaction(
        transaction,
        augmentedFinancialIncomeData,
        augmentedTransactionGroupData,
        currencyById.get(transaction.currencyId)!,
        currencyById.get(transaction.receiverCurrencyId)!,
        transaction.categoryId === null ? undefined : categoryById.get(transaction.categoryId),
        transaction.senderId === null ? undefined : accountById.get(transaction.senderId),
        transaction.receiverId === null ? undefined : accountById.get(transaction.receiverId),
        settlementGroups.get(transaction.id),
      )
    })
  }, [transactions, currencies, categories, accounts, augmentedTransactionGroups, settlements])

  // Other members' transactions are stripped of their owner's accounts, category and
  // financial income data, and carry this user's currency for the group.
  const augmentedTransactionsFromGroupMembers = useMemo<AugmentedTransaction[]>(() => {
    return transactionsFromGroupMembers.flatMap<AugmentedTransaction>((transaction) => {
      const transactionGroup = augmentedTransactionGroups.find(
        (tg) => tg.id === transaction.transactionGroupData?.transactionGroupId,
      )
      const currency = currencies.find((c) => c.id === transaction.currencyId)
      if (transaction.transactionGroupData === null || !transactionGroup || !currency) return []

      return [
        new AugmentedTransaction(
          transaction,
          null,
          new AugmentedTransactionGroupData(transaction.transactionGroupData, transactionGroup),
          currency,
          currency,
        ),
      ]
    })
  }, [transactionsFromGroupMembers, currencies, augmentedTransactionGroups])

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

    const rateTimes = new Map<number, Map<number, number[]>>()
    for (const [from, specificRates] of exchangeRates.entries()) {
      const times = new Map<number, number[]>()
      rateTimes.set(from, times)
      for (const [to, list] of specificRates.entries()) {
        list.sort((e1, e2) => e1.date.getTime() - e2.date.getTime())
        times.set(
          to,
          list.map((r) => r.date.getTime()),
        )
      }
    }

    const exchangeRateOnDay = (from: number, to: number, date: Date): number => {
      const specificRates = exchangeRates.get(from)?.get(to)
      const times = rateTimes.get(from)?.get(to)
      if (typeof specificRates === 'undefined' || typeof times === 'undefined') {
        return 1
      }

      const time = date.getTime()
      let low = 0
      let high = times.length
      while (low < high) {
        const middle = (low + high) >> 1
        if (times[middle] < time) low = middle + 1
        else high = middle
      }

      let beforeIndex = low - 1
      let afterIndex = low
      if (beforeIndex === -1) beforeIndex = 0
      if (afterIndex === times.length) afterIndex -= 1
      const before = specificRates[beforeIndex]
      const after = specificRates[afterIndex]
      const ratio =
        beforeIndex === afterIndex ? 1 : (time - times[beforeIndex]) / (times[afterIndex] - times[beforeIndex])
      return after.rate * ratio + before.rate * (1 - ratio)
    }

    return { exchangeRates, exchangeRateOnDay }
  }, [rawExchangeRates, transactions])

  const value = useMemo(
    () =>
      tentativeRoot === null || tentativeDefaultCurrency === null
        ? null
        : {
            rootCategory: tentativeRoot,
            defaultCurrency: tentativeDefaultCurrency,
            accountBalances,
            augmentedTransactionGroups,
            augmentedTransactions,
            augmentedTransactionsFromGroupMembers,
            ...augmentedData,
          },
    [
      tentativeRoot,
      tentativeDefaultCurrency,
      accountBalances,
      augmentedTransactionGroups,
      augmentedTransactions,
      augmentedTransactionsFromGroupMembers,
      augmentedData,
    ],
  )

  if (value === null) {
    return <LoadingScreen />
  }

  return (
    <MixedAugmentation.Provider value={value}>
      <NextComponent />
    </MixedAugmentation.Provider>
  )
}

export default MixedAugmentation
