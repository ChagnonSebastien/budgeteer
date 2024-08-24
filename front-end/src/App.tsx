import {
  IonApp,
  IonButton,
  setupIonicReact,
} from "@ionic/react"
import { createContext, FC, lazy } from "react"
import { IconToolsContext, useIconTools } from "./components/IconTools"
import LoadingScreen from "./components/LoadingScreen"
import User from "./domain/model/user"
import useAuthentication from "./useAuthentication"

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css"

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css"
import "@ionic/react/css/structure.css"
import "@ionic/react/css/typography.css"

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css"
import "@ionic/react/css/float-elements.css"
import "@ionic/react/css/text-alignment.css"
import "@ionic/react/css/text-transformation.css"
import "@ionic/react/css/flex-utils.css"
import "@ionic/react/css/display.css"

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css"

/* Theme variables */
import "./theme/variables.css"

import "./App.css"

setupIonicReact()

export const UserContext = createContext<User>({
  name: "name",
  default_currency: null,
  email: "email",
  sub: "sub",
  preferred_username: "username",
})

const AuthenticatedZone = lazy(() => import("./AuthenticatedZone"))

const App: FC = () => {
  const {user, synced, hasInternet, authMethods, logout, setDefaultCurrency} = useAuthentication()

  const iconTools = useIconTools()

  if (user !== null) {
    if (!hasInternet || synced) {
      return (
        <IonApp>
          <IconToolsContext.Provider value={iconTools}>
            <UserContext.Provider value={user}>
              <AuthenticatedZone logout={logout}
                                 setDefaultCurrency={setDefaultCurrency}/>
            </UserContext.Provider>
          </IconToolsContext.Provider>
        </IonApp>
      )
    } else {
      return <LoadingScreen/>
    }
  }

  if (!hasInternet) {
    return <div className="centered">Internet connection required on first use</div>
  }

  if (authMethods !== null && authMethods.oidc === null) {
    return <div className="centered">Only OIDC is supported as of now</div>
  }

  if (authMethods === null || !synced) {
    return <LoadingScreen/>
  }

  return (
    <div className="centered">
      <IonButton onClick={authMethods.oidc!}>
        OIDC Login
      </IonButton>
    </div>
  )
}

export default App
