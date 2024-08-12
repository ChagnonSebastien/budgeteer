import { IonPage } from "@ionic/react"
import { FC } from "react"
import ContentWithHeader from "../components/ContentWithHeader"

const UnimplementedPage: FC = () => {
  return (
    <IonPage>
      <ContentWithHeader title="Unimplemented" button="return">
        Not implemented
      </ContentWithHeader>
    </IonPage>
  )
}

export default UnimplementedPage
