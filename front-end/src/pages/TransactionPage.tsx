import { IonFab, IonFabButton, IonFabList, IonPage, useIonRouter } from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { IconToolsContext } from "../components/IconTools"
import { TransactionList } from "../components/TransactionList"
import { AugmentedTransaction } from "../domain/model/transaction"
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "../service/ServiceContext"

const TransactionPage: FC = () => {
  const router = useIonRouter()

  const {state: transactions} = useContext(TransactionServiceContext)
  const {state: currencies} = useContext(CurrencyServiceContext)
  const {state: categories} = useContext(CategoryServiceContext)
  const {state: accounts} = useContext(AccountServiceContext)

  const {iconTypeFromName} = useContext(IconToolsContext)
  const FaPlus = useMemo(() => iconTypeFromName("FaPlus"), [iconTypeFromName])
  const GrTransaction = useMemo(() => iconTypeFromName("GrTransaction"), [iconTypeFromName])
  const MdOutput = useMemo(() => iconTypeFromName("MdOutput"), [iconTypeFromName])
  const MdInput = useMemo(() => iconTypeFromName("MdInput"), [iconTypeFromName])

  const augmentedTransaction = useMemo<AugmentedTransaction[]>(() => {
    return transactions.map<AugmentedTransaction>(transaction => ({
      ...transaction,
      category: categories.find(c => c.id === transaction.categoryId)!,
      currency: currencies.find(c => c.id === transaction.currencyId)!,
      sender: accounts.find(c => c.id === transaction.senderId),
      receiver: accounts.find(c => c.id === transaction.receiverId),
    }))
  }, [transactions, currencies, categories, accounts])

  return (
    <IonPage>
      <ContentWithHeader title="Transactions" button="menu">
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton>
            <FaPlus/>
          </IonFabButton>
          <IonFabList side="top">
            <IonFabButton color="success" onClick={() => router.push("/transactions/new?type=income")}>
              <MdInput/>
            </IonFabButton>
            <IonFabButton color="danger" onClick={() => router.push("/transactions/new?type=expense")}>
              <MdOutput/>
            </IonFabButton>
            <IonFabButton color="dark" onClick={() => router.push("/transactions/new?type=transfer")}>
              <GrTransaction/>
            </IonFabButton>
          </IonFabList>
        </IonFab>

        <TransactionList transactions={augmentedTransaction}
                         onClick={(transactionId) => {
                           router.push(`/transactions/edit/${transactionId}`)
                         }}
        />
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
