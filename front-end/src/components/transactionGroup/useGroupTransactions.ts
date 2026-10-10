import { useContext, useMemo } from 'react'

import { UserContext } from '../../App'
import Settlement, { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import Transaction, { AugmentedTransaction, AugmentedTransactionGroupData } from '../../domain/model/transaction'
import { AugmentedTransactionGroup } from '../../domain/model/transactionGroup'
import UnconfirmedTransaction, { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import {
  SettlementServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'

interface GroupTransactionSources {
  isGuest: boolean
  augmentedTransactions: AugmentedTransaction[]
  augmentedTransactionsFromGroupMembers: AugmentedTransaction[]
  rawTransactions: Transaction[]
  unconfirmedTransactions: UnconfirmedTransaction[]
  settlements: Settlement[]
}

export const useGroupTransactionSources = (): GroupTransactionSources => {
  const { authentification_method } = useContext(UserContext)
  const { augmentedTransactions, augmentedTransactionsFromGroupMembers } = useContext(MixedAugmentation)
  const { state: ownTransactions, transactionsFromGroupMembers } = useContext(TransactionServiceContext)
  const { state: unconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)
  const { state: settlements } = useContext(SettlementServiceContext)

  return useMemo(
    () => ({
      isGuest: authentification_method === 'guest',
      augmentedTransactions,
      augmentedTransactionsFromGroupMembers,
      rawTransactions: [...ownTransactions, ...transactionsFromGroupMembers],
      unconfirmedTransactions,
      settlements,
    }),
    [
      authentification_method,
      augmentedTransactions,
      augmentedTransactionsFromGroupMembers,
      ownTransactions,
      transactionsFromGroupMembers,
      unconfirmedTransactions,
      settlements,
    ],
  )
}

export const buildGroupTransactions = (
  transactionGroup: AugmentedTransactionGroup,
  sources: GroupTransactionSources,
): AugmentedTransaction[] => {
  const id = transactionGroup.id
  const currency = transactionGroup.augmentedCurrency

  const confirmed = sources.isGuest
    ? sources.rawTransactions
        .filter((t) => t.transactionGroupData?.transactionGroupId === id)
        .map(
          (t) =>
            new AugmentedTransaction(
              t,
              null,
              new AugmentedTransactionGroupData(t.transactionGroupData!, transactionGroup),
              currency,
              currency,
            ),
        )
    : [
        ...sources.augmentedTransactions.filter(
          (t) => t.transactionGroupData?.transactionGroupId === id && t.getType() === 'expense',
        ),
        // Other members' transactions have no category or accounts, so getType() can't classify them.
        ...sources.augmentedTransactionsFromGroupMembers.filter(
          (t) => t.transactionGroupData?.transactionGroupId === id,
        ),
      ]

  // Unconfirmed count toward totals: a guest's expenses can never be promoted.
  return [
    ...confirmed,
    ...sources.unconfirmedTransactions
      .filter((ut) => ut.transactionGroupId === id)
      .map((ut) => new UnconfirmedAugmentedTransaction(ut, transactionGroup)),
    ...sources.settlements
      .filter((s) => s.transactionGroupId === id)
      .map((s) => new SettlementAugmentedTransaction(s, transactionGroup)),
  ].sort((a, b) => {
    if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
    return b.id - a.id
  })
}

export const canDeleteGroup = (transactions: AugmentedTransaction[], email: string): boolean =>
  transactions.every((t) => (t instanceof SettlementAugmentedTransaction ? !t.settlement.completed : t.owner === email))

export const userBalance = (transactions: AugmentedTransaction[], email: string): number =>
  transactions.reduce((sum, t) => sum + t.getUserContribution(email), 0)

const useGroupTransactions = (transactionGroup: AugmentedTransactionGroup | undefined): AugmentedTransaction[] => {
  const sources = useGroupTransactionSources()
  return useMemo(
    () => (transactionGroup ? buildGroupTransactions(transactionGroup, sources) : []),
    [transactionGroup, sources],
  )
}

export default useGroupTransactions
