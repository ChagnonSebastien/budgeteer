import {
  IonContent,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonMenu,
  IonMenuToggle,
  IonNote, useIonRouter,
} from "@ionic/react"

import { useLocation } from "react-router-dom"
import "./Menu.css"
import { FC, useContext } from "react"
import { IconToolsContext } from "./IconTools"

interface AppPage {
  title: string;
  url: string;
  iconName: string;
}

const appPages: AppPage[] = [
  {
    title: "Transactions",
    url: "/transactions",
    iconName: "TbArrowsExchange",
  },
  {
    title: "Categories",
    url: "/categories",
    iconName: "MdCategory",
  },
  {
    title: "Currencies",
    url: "/currencies",
    iconName: "BsCurrencyExchange",
  },
  {
    title: "Import",
    url: "/import",
    iconName: "BiSolidFileImport",
  },
]

const Menu: FC = () => {
  const location = useLocation()
  const router = useIonRouter()

  const {iconTypeFromName} = useContext(IconToolsContext)

  const iconStyle = {margin: "0.5rem"}

  return (
    <IonMenu contentId="main" type="overlay">
      <IonContent>
        <IonList id="inbox-list">
          <IonListHeader>Budget App</IonListHeader>
          <IonNote>hi@ionicframework.com</IonNote>
          {appPages.map((appPage, index) => {
            const Icon = iconTypeFromName(appPage.iconName)
            return (
              <IonMenuToggle key={index} autoHide={false}>
                <IonItem
                  className={location.pathname === appPage.url ? "selected" : ""}
                  style={{cursor: "pointer"}}
                  onClick={() => router.push(appPage.url)}
                >
                  <Icon style={iconStyle}/>
                  <IonLabel>{appPage.title}</IonLabel>
                </IonItem>
              </IonMenuToggle>
            )
          })}
        </IonList>
      </IonContent>
    </IonMenu>
  )
}

export default Menu
