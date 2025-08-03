import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import TransactionForm from '../components/transactions/TransactionForm'
import Transaction from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { TransactionServiceContext } from '../service/ServiceContext'

type Params = {
  transactionId: string
}

const EditTransactionPage: FC = () => {
  const navigate = useNavigate()

  const { transactionId } = useParams<Params>()
  const { update: updateTransaction } = useContext(TransactionServiceContext)
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const selectedTransaction = useMemo(
    () => augmentedTransactions.find((t) => t.id === parseInt(transactionId!)),
    [augmentedTransactions, transactionId],
  )

  const onSubmit = useCallback(
    async (data: Partial<Omit<Transaction, 'id' | 'hasName'>>) => {
      if (typeof selectedTransaction === 'undefined') return

      await updateTransaction({ id: selectedTransaction.id }, data)

      navigate(-1)
    },
    [updateTransaction, selectedTransaction],
  )

  if (typeof selectedTransaction === 'undefined') {
    navigate('/transactions', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit Transaction" action="return" withPadding withScrolling>
      <TransactionForm onSubmit={onSubmit} submitText="Update" initialTransaction={selectedTransaction} />
    </ContentWithHeader>
  )
}

export default EditTransactionPage
