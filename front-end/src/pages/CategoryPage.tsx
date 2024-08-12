import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react"
import { FC, useMemo, useRef, useState } from "react"
import { BiArrowBack } from "react-icons/bi"
import IconCapsule from "../components/IconCapsule"
import IconList from "../components/IconList"
import ContentWithHeader from "../components/ContentWithHeader"

const CategoryPage: FC = () => {
  const modal = useRef<HTMLIonModalElement>(null)

  const [filter, setFilter] = useState<string>("")
  const [selectedIcon, setSelectedIcon] = useState<string>()

  const onFilterChange = (event: Event) => {
    const value = (event.target as HTMLIonInputElement).value as string
    setFilter(value)
  }

  function onIconSelect(newIconName: string) {
    setSelectedIcon(newIconName)
    modal.current?.dismiss()
  }

  return (
    <IonPage>
      <ContentWithHeader title="Categories" button="menu" onSearch={onFilterChange}>
        <IonButton id="open-select-icon-modal" expand="block">
          Select Icon
        </IonButton>
        <div style={{display: "flex", justifyContent: "center", padding: "1rem"}}>
          {selectedIcon &&
            <IconCapsule iconName={selectedIcon} size="6rem" color="darkslategray" backgroundColor="orange"/>}
        </div>

        <IonModal ref={modal} trigger="open-select-icon-modal" onWillDismiss={() => modal.current?.dismiss()}>
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => modal.current?.dismiss()}><BiArrowBack/></IonButton>
              </IonButtons>
              <IonTitle>Select Icon</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <IconList filter={filter} onSelect={onIconSelect}/>
          </IonContent>
        </IonModal>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CategoryPage
