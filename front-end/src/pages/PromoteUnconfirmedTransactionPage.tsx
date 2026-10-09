import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { useToast } from '../components/shared/ToastProvider'
import TransactionForm from '../components/transactions/TransactionForm'
import Transaction, {
  AugmentedTransaction,
  AugmentedTransactionGroupData,
  TransactionGroupData,
  TransactionUpdatableFields,
} from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import {
  CategoryServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
  unconfirmedTransactionId: string
}

const PromoteUnconfirmedTransactionPage: FC = () => {
  const { transactionGroupId, unconfirmedTransactionId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { augmentedTransactionGroups } = useContext(MixedAugmentation)
  const { augmentedCategories } = useContext(CategoryServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const {
    state: unconfirmedTransactions,
    promote,
    refresh: refreshUnconfirmedTransactions,
  } = useContext(UnconfirmedTransactionServiceContext)
  const { showToast } = useToast()

  const transactionGroup = useMemo(
    () => augmentedTransactionGroups.find((tg) => tg.id === parseInt(transactionGroupId!)),
    [augmentedTransactionGroups, transactionGroupId],
  )

  const unconfirmedTransaction = useMemo(
    () => unconfirmedTransactions.find((ut) => ut.id === parseInt(unconfirmedTransactionId!)),
    [unconfirmedTransactions, unconfirmedTransactionId],
  )

  const initialTransaction = useMemo(() => {
    if (!transactionGroup || !unconfirmedTransaction) return undefined

    const transactionGroupData = new TransactionGroupData(transactionGroup.id, unconfirmedTransaction.splitOverride)
    return new AugmentedTransaction(
      new Transaction(
        0,
        email,
        unconfirmedTransaction.amount,
        transactionGroup.augmentedCurrency.id,
        transactionGroup.augmentedCategory.id,
        unconfirmedTransaction.date,
        null,
        null,
        unconfirmedTransaction.note,
        transactionGroup.augmentedCurrency.id,
        unconfirmedTransaction.amount,
        null,
        transactionGroupData,
      ),
      null,
      new AugmentedTransactionGroupData(transactionGroupData, transactionGroup),
      transactionGroup.augmentedCurrency,
      transactionGroup.augmentedCurrency,
      augmentedCategories.find((c) => c.id === transactionGroup.augmentedCategory.id),
    )
  }, [transactionGroup, unconfirmedTransaction, email, augmentedCategories])

  const onSubmit = useCallback(
    async (data: Partial<TransactionUpdatableFields>) => {
      if (typeof unconfirmedTransaction === 'undefined') return
      if (typeof data.amount === 'undefined') throw new Error('amount cannot be undefined')
      if (typeof data.currencyId === 'undefined') throw new Error('currencyId cannot be undefined')
      if (typeof data.categoryId === 'undefined') throw new Error('categoryId cannot be undefined')
      if (typeof data.date === 'undefined') throw new Error('date cannot be undefined')
      if (typeof data.senderId === 'undefined') throw new Error('senderId cannot be undefined')
      if (typeof data.receiverId === 'undefined') throw new Error('receiverId cannot be undefined')
      if (typeof data.note === 'undefined') throw new Error('note cannot be undefined')
      if (typeof data.receiverCurrencyId === 'undefined') throw new Error('receiverCurrencyId cannot be undefined')
      if (typeof data.receiverAmount === 'undefined') throw new Error('receiverAmount cannot be undefined')

      // The group link and split are carried over by the server.
      await promote(
        { id: unconfirmedTransaction.id },
        {
          amount: data.amount,
          currencyId: data.currencyId,
          senderId: data.senderId,
          receiverId: data.receiverId,
          categoryId: data.categoryId,
          date: data.date,
          note: data.note,
          receiverCurrencyId: data.receiverCurrencyId,
          receiverAmount: data.receiverAmount,
        },
      )
      await Promise.all([refreshTransactions(), refreshUnconfirmedTransactions()])
      showToast('Added to your transactions')
      navigate(`/transaction-groups/manage/${transactionGroupId}`, { replace: true })
    },
    [
      unconfirmedTransaction,
      promote,
      refreshTransactions,
      refreshUnconfirmedTransactions,
      showToast,
      navigate,
      transactionGroupId,
    ],
  )

  if (!transactionGroup || !unconfirmedTransaction || !initialTransaction) {
    return <LoadingScreen />
  }

  return (
    <ContentWithHeader title="Add to my transactions" action="return" withPadding withScrolling>
      <TransactionForm initialTransaction={initialTransaction} onSubmit={onSubmit} submitText="Add" type="expense" />
    </ContentWithHeader>
  )
}

export default PromoteUnconfirmedTransactionPage
