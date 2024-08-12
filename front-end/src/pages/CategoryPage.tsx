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
import { FC, useContext, useMemo, useRef, useState } from "react"
import IconCapsule from "../components/IconCapsule"
import IconList from "../components/IconList"
import ContentWithHeader from "../components/ContentWithHeader"
import { IconToolsContext } from "../components/IconTools"

const CategoryPage: FC = () => {
  const modal = useRef<HTMLIonModalElement>(null)

  const {iconTypeFromName} = useContext(IconToolsContext)

  const [filter, setFilter] = useState<string>("")
  const [selectedIcon, setSelectedIcon] = useState<string>()

  const BiArrowBack = useMemo(() => iconTypeFromName("BiArrowBack"), [iconTypeFromName])

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
      <ContentWithHeader title="Categories" button="menu">
        <IonButton id="open-select-icon-modal" expand="block">
          Select Icon
        </IonButton>
        <div style={{display: "flex", justifyContent: "center", padding: "1rem"}}>
          {selectedIcon &&
            <IconCapsule iconName={selectedIcon} size="6rem" color="darkslategray" backgroundColor="orange"/>}
        </div>

        <IonModal ref={modal} trigger="open-select-icon-modal" onWillDismiss={() => modal.current?.dismiss()}>
          <ContentWithHeader title="Select Icon" button="return" onSearch={onFilterChange}>
            <IconList filter={filter} onSelect={onIconSelect}/>
          </ContentWithHeader>
        </IonModal>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CategoryPage
