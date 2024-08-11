import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/react"
import { useParams } from "react-router"
import TransactionPage from "./TransactionPage"
import "./Page.css"
import ImportSpreadsheet from "../components/ImportSpreadsheet"
import { FC } from "react"

const Page: FC = () => {

  console.log("Not implemented page rendered")

  let displayedPage = <p>Not implemented</p>

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonMenuButton/>
          </IonButtons>
          <IonTitle>{"name"}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">{"name"}</IonTitle>
          </IonToolbar>
        </IonHeader>
        {displayedPage}
      </IonContent>
    </IonPage>
  )
}

export default Page
