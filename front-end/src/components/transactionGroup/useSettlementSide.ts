import { useContext } from 'react'

import { UserContext } from '../../App'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { TransactionServiceContext } from '../../service/ServiceContext'

export type SettlementSideState = 'ok' | 'missing' | 'differs'

const useSettlementSide = (item: SettlementAugmentedTransaction) => {
  const { email, authentification_method } = useContext(UserContext)
  const { state: transactions, update: updateTransaction } = useContext(TransactionServiceContext)
  const { settlement } = item

  const own = transactions.find((t) => t.id === settlement.ownTransactionId)
  let state: SettlementSideState = 'ok'
  if (settlement.completed && settlement.isEnd(email) && authentification_method !== 'guest') {
    if (!own) state = 'missing'
    // Another currency has no exchange rate to compare with, so only same-currency drift is detected.
    else if (own.currencyId === item.currency.id && own.amount !== settlement.amount) state = 'differs'
  }

  const restoreAmount = async () => {
    if (!own) return
    await updateTransaction(
      { id: own.id },
      {
        amount: settlement.amount,
        receiverAmount: own.receiverCurrencyId === own.currencyId ? settlement.amount : own.receiverAmount,
      },
    )
  }

  return { state, restoreAmount }
}

export default useSettlementSide
