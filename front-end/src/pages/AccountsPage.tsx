import {
  IonButton,
  IonPage,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext } from "react"
import { AccountList } from "../components/AccountList"
import ContentWithHeader from "../components/ContentWithHeader"
import { AccountServiceContext } from "../service/ServiceContext"


const AccountsPage: FC = () => {
  const router = useIonRouter()

  const {state: accounts} = useContext(AccountServiceContext)

  return (
    <IonPage>
      <ContentWithHeader title="Accounts" button="menu">
        <div style={{margin: "1rem"}}>
          <IonButton expand="block" onClick={() => router.push("/categories/new")}>
            New
          </IonButton>
          <div style={{height: "1rem"}}/>
          <AccountList accounts={accounts} onSelect={id => router.push(`/categories/edit/${id}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default AccountsPage
