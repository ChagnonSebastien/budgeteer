import { createContext, FC, useContext, useMemo } from "react"
import { AugmentedTransaction } from "../domain/model/transaction"
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "./ServiceContext"

type CurrencyAmounts = Map<number, number>
type AccountBalances = Map<number, CurrencyAmounts>

type MixedAugmentationContext = {
  accountBalances: AccountBalances
  augmentedTransactions: AugmentedTransaction[]
}

const MixedAugmentation = createContext<MixedAugmentationContext>({
  accountBalances: new Map(),
  augmentedTransactions: [],
})

export interface Props {
  children: JSX.Element
}

export const MixedAugmentationProvider: FC<Props> = ({children}) => {

  const {state: transactions} = useContext(TransactionServiceContext)
  const {state: currencies} = useContext(CurrencyServiceContext)
  const {state: categories} = useContext(CategoryServiceContext)
  const {state: accounts} = useContext(AccountServiceContext)

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
        currencyMap.set(transaction.currencyId, (currencyMap.get(transaction.currencyId) ?? 0) + transaction.amount)
      }
    }

    return accountAmounts
  }, [accounts, transactions])

  const augmentedTransactions = useMemo<AugmentedTransaction[]>(() => {
    return transactions.map<AugmentedTransaction>(transaction => ({
      ...transaction,
      category: categories.find(c => c.id === transaction.categoryId),
      currency: currencies.find(c => c.id === transaction.currencyId)!,
      sender: accounts.find(c => c.id === transaction.senderId),
      receiver: accounts.find(c => c.id === transaction.receiverId),
    }))
  }, [transactions, currencies, categories, accounts])

  return (
    <MixedAugmentation.Provider value={{accountBalances, augmentedTransactions}}>
      {children}
    </MixedAugmentation.Provider>
  )
}

export default MixedAugmentation