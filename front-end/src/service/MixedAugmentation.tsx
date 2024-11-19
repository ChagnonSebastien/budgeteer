import { addDays, differenceInMilliseconds, isBefore, isSameDay, subDays } from 'date-fns'
import { createContext, FC, useCallback, useContext, useMemo } from 'react'

import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from './ServiceContext'
import { ExchangeRate } from '../domain/model/currency'
import { AugmentedTransaction } from '../domain/model/transaction'

type DayData = { total: number; portfolio: number; raw: number }
type MonthData = DayData & { days: Map<number, DayData> }
type YearData = DayData & { months: Map<number, MonthData> }
type AccountData = DayData & { years: Map<number, YearData> }
type TotalData = Map<number, AccountData>

type CurrencyAmounts = Map<number, number>
type AccountBalances = Map<number, CurrencyAmounts>

type MixedAugmentationContext = {
  accountBalances: AccountBalances
  augmentedTransactions: AugmentedTransaction[]
  exchangeRates: Map<number, Map<number, ExchangeRate[]>>
  exchangeRateOnDay(from: number, to: number, date: Date): number
  accountTotals: TotalData | null
}

const MixedAugmentation = createContext<MixedAugmentationContext>({
  accountBalances: new Map(),
  augmentedTransactions: [],
  exchangeRates: new Map(),
  exchangeRateOnDay: (_from: number, _to: number, _date: Date) => 1,
  accountTotals: new Map(),
})

export interface Props {
  children: JSX.Element
}

export const MixedAugmentationProvider: FC<Props> = ({ children }) => {
  const { state: transactions } = useContext(TransactionServiceContext)
  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)
  const { augmentedCategories: categories } = useContext(CategoryServiceContext)
  const { state: accounts, myOwnAccounts } = useContext(AccountServiceContext)

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

  const accountTotals = useMemo(() => {
    if (defaultCurrency === null) return null
    if (augmentedTransactions.length === 0) return null

    const fromDate = subDays(augmentedTransactions[augmentedTransactions.length - 1].date, 1)
    const toDate = new Date()

    const Investments = myOwnAccounts.reduce((totals, account) => {
      const currencies = new Map<number, number>()
      for (const initialAmount of account.initialAmounts) {
        if (initialAmount.currencyId !== defaultCurrency.id) {
          currencies.set(initialAmount.currencyId, initialAmount.value)
        }
      }
      totals.set(account.id, currencies)
      return totals
    }, new Map<number, Map<number, number>>())

    const AccountTotals = myOwnAccounts.reduce<TotalData>((totals, account) => {
      const total = account.initialAmounts
        .map((initialAmount) => {
          if (initialAmount.currencyId === defaultCurrency.id) return initialAmount.value
          return 0
        })
        .reduce((a, b) => a + b, 0)
      const raw = account.initialAmounts
        .map((initialAmount) => {
          if (initialAmount.currencyId === defaultCurrency.id) return initialAmount.value
          return exchangeRateOnDay(initialAmount.currencyId, defaultCurrency.id, fromDate) * initialAmount.value
        })
        .reduce((a, b) => a + b, 0)
      const portfolio = 0
      const days = new Map<number, DayData>()
      const months = new Map<number, MonthData>()
      const years = new Map<number, YearData>()
      days.set(fromDate.getDate(), { total, portfolio, raw })
      months.set(fromDate.getMonth(), { total, days, portfolio, raw })
      years.set(fromDate.getFullYear(), { total, months, portfolio, raw })
      totals.set(account.id, { total, years, portfolio, raw })
      return totals
    }, new Map())

    let upTo = fromDate
    let i = augmentedTransactions.length - 1

    while (!isSameDay(upTo, toDate)) {
      const yesterday = upTo
      upTo = addDays(yesterday, 1)

      for (const totalData of AccountTotals.values()) {
        let year = totalData.years.get(upTo.getFullYear())
        if (typeof year === 'undefined') {
          const { total, portfolio, raw } = totalData.years.get(yesterday.getFullYear())!
          year = { total, portfolio, raw, months: new Map<number, MonthData>() }
          totalData.years.set(upTo.getFullYear(), year)
        }

        let month = year.months.get(upTo.getMonth())
        if (typeof month === 'undefined') {
          const { total, portfolio, raw } = totalData.years.get(yesterday.getFullYear())!.months.get(yesterday.getMonth())!
          month = { total, portfolio, raw, days: new Map<number, DayData>() }
          year.months.set(upTo.getMonth(), month)
        }

        let day = month.days.get(upTo.getDate())
        if (typeof day === 'undefined') {
          const { total, portfolio, raw } = totalData.years
            .get(yesterday.getFullYear())!
            .months.get(yesterday.getMonth())!
            .days.get(yesterday.getDate())!
          day = { total, portfolio, raw }
          month.days.set(upTo.getDate(), day)
        }
      }

      while (i >= 0 && (isBefore(augmentedTransactions[i].date, upTo) || isSameDay(toDate, upTo))) {
        const transaction = augmentedTransactions[i]

        // Investments incomes (such as dividends) should be marked as Investments such and not as raw incomes
        // Same thing for investments costs
        if (transaction.receiver?.isMine ?? false) {
          if (transaction.receiverCurrencyId === defaultCurrency?.id) {
            const account = AccountTotals.get(transaction.receiverId!)!
            const year = account.years.get(upTo.getFullYear())!
            const month = year.months.get(upTo.getMonth())!
            const day = month.days.get(upTo.getDate())!

            account.total += transaction.receiverAmount
            year.total += transaction.receiverAmount
            month.total += transaction.receiverAmount
            day.total += transaction.receiverAmount

            if (!(transaction.sender?.isMine ?? false)) {
              account.raw += transaction.receiverAmount
              year.raw += transaction.receiverAmount
              month.raw += transaction.receiverAmount
              day.raw += transaction.receiverAmount
            }

          } else {
            const receiver = Investments.get(transaction.receiverId!)!
            receiver.set(
              transaction.receiverCurrencyId,
              (receiver.get(transaction.receiverCurrencyId) ?? 0) + transaction.receiverAmount,
            )
          }
        }
        if (transaction.sender?.isMine ?? false) {
          if (transaction.currencyId === defaultCurrency?.id) {
            const account = AccountTotals.get(transaction.senderId!)!
            const year = account.years.get(upTo.getFullYear())!
            const month = year.months.get(upTo.getMonth())!
            const day = month.days.get(upTo.getDate())!

            account.total -= transaction.amount
            year.total -= transaction.amount
            month.total -= transaction.amount
            day.total -= transaction.amount

            if (!(transaction.receiver?.isMine ?? false)) {
              account.raw -= transaction.receiverAmount
              year.raw -= transaction.receiverAmount
              month.raw -= transaction.receiverAmount
              day.raw -= transaction.receiverAmount
            }

          } else {
            const sender = Investments.get(transaction.senderId!)!
            sender.set(transaction.currencyId, (sender.get(transaction.currencyId) ?? 0) - transaction.amount)
          }
        }

        i -= 1
      }

      for (const [accountId, investment] of Investments.entries()) {
        let portfolioValue = 0
        for (const [currencyId, amountOfShares] of investment) {
          portfolioValue += amountOfShares * exchangeRateOnDay(currencyId, defaultCurrency?.id, upTo)
        }

        const account = AccountTotals.get(accountId)!
        const year = account.years.get(upTo.getFullYear())!
        const month = year.months.get(upTo.getMonth())!
        const day = month.days.get(upTo.getDate())!

        account.portfolio = portfolioValue
        year.portfolio = portfolioValue
        month.portfolio = portfolioValue
        day.portfolio = portfolioValue
      }
    }

    return AccountTotals
  }, [exchangeRateOnDay, myOwnAccounts, augmentedTransactions])

  return (
    <MixedAugmentation.Provider
      value={{ accountBalances, augmentedTransactions, exchangeRates, exchangeRateOnDay, accountTotals }}
    >
      {children}
    </MixedAugmentation.Provider>
  )
}

export default MixedAugmentation
