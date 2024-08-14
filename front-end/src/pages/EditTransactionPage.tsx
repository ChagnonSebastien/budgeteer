import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext, useMemo } from "react"
import { useParams } from "react-router"
import ContentWithHeader from "../components/ContentWithHeader"
import TransactionForm from "../components/TransactionForm"
import Transaction from "../domain/model/transaction"
import { TransactionServiceContext } from "../service/ServiceContext"

interface Params {
  transactionId: string
}

const EditTransactionPage: FC = () => {
  const router = useIonRouter()

  const {transactionId} = useParams<Params>()
  const {state: transactions, update: updateTransaction} = useContext(TransactionServiceContext)
  const selectedTransaction = useMemo(() => transactions.find(t => t.id === parseInt(transactionId)), [transactions, transactionId])

  const onSubmit = useCallback(async (data: Omit<Transaction, "id">) => {
    await updateTransaction(selectedTransaction!.id, data)

    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/transactions", "back", "replace")
    }
  }, [])

  if (typeof selectedTransaction === "undefined") {
    router.push("/transactions", "back", "replace")
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Edit Transaction" button="return">
        <TransactionForm
          onSubmit={onSubmit}
          submitText="Save changes"
          initialTransaction={selectedTransaction}
          type={null}
        />
      </ContentWithHeader>
    </IonPage>

  )
}

export default EditTransactionPage
