import { IonFab, IonFabButton, IonFabList, IonPage, useIonRouter } from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { IconToolsContext } from "../components/IconTools"
import TransactionsPieChart from "../components/PieChart"
import { TransactionList } from "../components/TransactionList"
import MixedAugmentation from "../service/MixedAugmentation"

const TransactionPage: FC = () => {
  const router = useIonRouter()

  const {augmentedTransactions} = useContext(MixedAugmentation)

  const {iconTypeFromName} = useContext(IconToolsContext)
  const FaPlus = useMemo(() => iconTypeFromName("FaPlus"), [iconTypeFromName])
  const GrTransaction = useMemo(() => iconTypeFromName("GrTransaction"), [iconTypeFromName])
  const MdOutput = useMemo(() => iconTypeFromName("MdOutput"), [iconTypeFromName])
  const MdInput = useMemo(() => iconTypeFromName("MdInput"), [iconTypeFromName])

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
        
        <TransactionsPieChart augmentedTransactions={augmentedTransactions}/>

        <TransactionList transactions={augmentedTransactions}
                         onClick={(transactionId) => {
                           router.push(`/transactions/edit/${transactionId}`)
                         }}
        />
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
