import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext, useMemo } from "react"
import { useLocation } from "react-router-dom"
import ContentWithHeader from "../components/ContentWithHeader"
import TransactionForm from "../components/TransactionForm"
import Category from "../domain/model/category"
import Transaction from "../domain/model/transaction"
import { CategoryServiceContext, TransactionServiceContext } from "../service/ServiceContext"
import CategoryForm from "../components/CategoryForm"

const CreateCategoryPage: FC = () => {
  const router = useIonRouter()
  const location = useLocation()

  const query = useMemo(() => new URLSearchParams(location.search), [location.search])
  const type = useMemo(() => {
    switch (query.get("type")) {
      case "expense":
        return "expense"
      case "income":
        return "income"
      case "transfer":
        return "transfer"
      default:
        return null
    }
  }, [query])

  const {create: createTransaction} = useContext(TransactionServiceContext)

  const onSubmit = useCallback(async (data: Omit<Transaction, "id">) => {
    await createTransaction(data)
    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/transactions", "back", "replace")
    }
  }, [])

  return (
    <IonPage>
      <ContentWithHeader title={`Record new ${type ?? "transaction"}`} button="return">
        <TransactionForm
          onSubmit={onSubmit}
          submitText="Record"
          type={type}
        />
      </ContentWithHeader>
    </IonPage>

  )
}

export default CreateCategoryPage