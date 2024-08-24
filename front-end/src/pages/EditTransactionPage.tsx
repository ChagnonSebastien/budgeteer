import { IonButton, IonPage, useIonRouter } from '@ionic/react'
import { FC, useCallback, useContext, useMemo } from 'react'
import { useParams } from 'react-router'

import ContentWithHeader from '../components/ContentWithHeader'
import TransactionForm from '../components/TransactionForm'
import Transaction from '../domain/model/transaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { TransactionServiceContext } from '../service/ServiceContext'

interface Params {
  transactionId: string
}

const EditTransactionPage: FC = () => {
  const router = useIonRouter()

  const { transactionId } = useParams<Params>()
  const { update: updateTransaction } = useContext(TransactionServiceContext)
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const selectedTransaction = useMemo(
    () => augmentedTransactions.find((t) => t.id === parseInt(transactionId)),
    [augmentedTransactions, transactionId],
  )

  const onSubmit = useCallback(
    async (data: Omit<Transaction, 'id'>) => {
      if (typeof selectedTransaction === 'undefined') return

      await updateTransaction(selectedTransaction.id, data)

      if (router.canGoBack()) {
        router.goBack()
      } else {
        router.push('/transactions', 'back', 'replace')
      }
    },
    [updateTransaction, selectedTransaction],
  )

  if (typeof selectedTransaction === 'undefined') {
    router.push('/transactions', 'back', 'replace')
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Edit Transaction" button="return">
        <div style={{ margin: '1rem' }}>
          <TransactionForm onSubmit={onSubmit} submitText="Update" initialTransaction={selectedTransaction} />

          <div style={{ height: '.5rem' }} />

          <IonButton color="danger" expand="block" onClick={() => {}}>
            Delete
          </IonButton>
        </div>
      </ContentWithHeader>
    </IonPage>
  )
}

export default EditTransactionPage
