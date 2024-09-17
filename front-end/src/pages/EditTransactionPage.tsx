import { Button } from '@mui/material'
import { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentWithHeader from '../components/ContentWithHeader'
import TransactionForm from '../components/TransactionForm'
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
    async (data: Omit<Transaction, 'id'>) => {
      if (typeof selectedTransaction === 'undefined') return

      await updateTransaction(selectedTransaction.id, data)

      navigate('/transactions')
    },
    [updateTransaction, selectedTransaction],
  )

  if (typeof selectedTransaction === 'undefined') {
    navigate('/transactions')
    return null
  }

  return (
    <ContentWithHeader title="Edit Transaction" button="return">
      <div style={{ margin: '1rem' }}>
        <TransactionForm onSubmit={onSubmit} submitText="Update" initialTransaction={selectedTransaction} />

        <div style={{ height: '.5rem' }} />

        <Button color="error" onClick={() => {}}>
          Delete
        </Button>
      </div>
    </ContentWithHeader>
  )
}

export default EditTransactionPage
