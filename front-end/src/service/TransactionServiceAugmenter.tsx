import { FC, useContext, useMemo } from 'react'

import { AugmenterProps } from './BasicCrudServiceWithPersistence'
import { UserContext } from '../App'
import Transaction, { TransactionID } from '../domain/model/transaction'

export interface TransactionPersistenceAugmentation {
  // Overrides the persisted state so it only holds the user's own transactions,
  // which every existing consumer expects.
  state: Transaction[]
  // Transactions other members recorded in the user's transaction groups.
  transactionsFromGroupMembers: Transaction[]
}

export const TransactionPersistenceAugmenter: FC<
  AugmenterProps<TransactionID, Transaction, TransactionPersistenceAugmentation>
> = (props) => {
  const { augment, state } = props

  const { email } = useContext(UserContext)

  const augmentedData = useMemo(
    () => ({
      state: state.filter((transaction) => transaction.owner === email),
      transactionsFromGroupMembers: state.filter((transaction) => transaction.owner !== email),
    }),
    [state, email],
  )

  return augment(augmentedData)
}
