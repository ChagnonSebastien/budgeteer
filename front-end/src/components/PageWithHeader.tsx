import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react"
import { FC, ReactNode } from "react"

interface Props {
  children: ReactNode | ReactNode[]
  title: string
  button: "menu" | "return" | "none"

}

const PageWithHeader: FC<Props> = ({title, children, button: buttonOption}) => {
  let button = null
  switch (buttonOption) {
    case "return":
      button = <IonBackButton/>
      break
    case "menu":
      button = <IonMenuButton/>
      break
  }

  return (
    <IonPage key={`page-${title}`}>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons collapse slot="start">
            {button}
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonButtons collapse slot="start">
              {button}
            </IonButtons>
            <IonTitle size="large">{title}</IonTitle>
          </IonToolbar>
        </IonHeader>

        {children}
      </IonContent>
    </IonPage>
  )
}

export default PageWithHeader