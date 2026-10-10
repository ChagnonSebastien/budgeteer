import { Alert, Button } from '@mui/material'
import { FC, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column, Row } from '../components/shared/Layout'
import { useToast } from '../components/shared/ToastProvider'
import TransactionForm from '../components/transactions/TransactionForm'
import Transaction from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { SettlementServiceContext, TransactionServiceContext } from '../service/ServiceContext'

type Params = {
  transactionId: string
}

const EditTransactionPage: FC = () => {
  const navigate = useNavigate()

  const { transactionId } = useParams<Params>()
  const { update: updateTransaction } = useContext(TransactionServiceContext)
  const { state: settlements } = useContext(SettlementServiceContext)
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { showToast } = useToast()
  const [acknowledgedSettlement, setAcknowledgedSettlement] = useState(false)
  const selectedTransaction = useMemo(
    () => augmentedTransactions.find((t) => t.id === parseInt(transactionId!)),
    [augmentedTransactions, transactionId],
  )
  const partOfCompletedSettlement = settlements.some(
    (s) => s.completed && s.ownTransactionId !== null && s.ownTransactionId === selectedTransaction?.id,
  )

  const onSubmit = useCallback(
    async (data: Partial<Omit<Transaction, 'id' | 'hasName'>>) => {
      if (typeof selectedTransaction === 'undefined') return

      await updateTransaction({ id: selectedTransaction.id }, data)

      showToast('Transaction updated')
      navigate(-1)
    },
    [updateTransaction, selectedTransaction, navigate, showToast],
  )

  if (typeof selectedTransaction === 'undefined') {
    navigate('/transactions', { replace: true })
    return null
  }

  return (
    <ContentWithHeader title="Edit Transaction" action="return" withPadding withScrolling>
      {partOfCompletedSettlement && !acknowledgedSettlement ? (
        <Column style={{ gap: '1rem', maxWidth: '32rem', margin: '0 auto' }}>
          <Alert severity="warning">
            This transaction is part of a completed settlement. Adjustments should rather be made with a new settlement:
            editing it here only changes your records, which will no longer match the settlement.
          </Alert>
          <Row style={{ gap: '1rem', justifyContent: 'end' }}>
            <Button onClick={() => navigate(-1)}>Go back</Button>
            <Button variant="contained" color="warning" onClick={() => setAcknowledgedSettlement(true)}>
              Edit anyway
            </Button>
          </Row>
        </Column>
      ) : (
        <TransactionForm onSubmit={onSubmit} submitText="Update" initialTransaction={selectedTransaction} />
      )}
    </ContentWithHeader>
  )
}

export default EditTransactionPage
