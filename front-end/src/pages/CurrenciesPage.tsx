import {
  IonButton,
  IonPage,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { CurrencyList } from "../components/CurrencyList"
import { CurrencyServiceContext } from "../service/ServiceContext"

const CurrenciesPage: FC = () => {
  const router = useIonRouter()

  const {state: currencies} = useContext(CurrencyServiceContext)

  return (
    <IonPage>
      <ContentWithHeader title="Currencies" button="menu">
        <div style={{margin: "1rem"}}>
          <IonButton expand="block" onClick={() => router.push("/currencies/new")}>
            New
          </IonButton>
          <div style={{height: "1rem"}}/>
          <CurrencyList currencies={currencies} onSelect={currencyId => router.push(`/currencies/edit/${currencyId}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CurrenciesPage
