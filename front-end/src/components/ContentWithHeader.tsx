import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonMenuButton,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from "@ionic/react"
import { FC, ReactNode } from "react"

interface Props {
  children: ReactNode | ReactNode[]
  title: string
  button: "menu" | "return" | "none"
  onSearch?: (ev: Event) => void
}

const ContentWithHeader: FC<Props> = (props) => {
  const {title, children, button: buttonOption, onSearch} = props
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
    <>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons collapse slot="start">
            {button}
          </IonButtons>
          <IonTitle>{title}</IonTitle>
        </IonToolbar>
        {typeof onSearch !== "undefined" && (
          <IonToolbar>
            <IonSearchbar onIonInput={onSearch}/>
          </IonToolbar>
        )}
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
    </>
  )
}

export default ContentWithHeader