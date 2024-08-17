import {
  IonApp,
  IonButton,
  IonSpinner,
  setupIonicReact,
} from "@ionic/react"
import { WithItemTools } from "./components/IconTools"
import { FC, lazy } from "react"
import LoadingScreen from "./LoadingScreen"
import useAuthentication from "./UseAuthentication"

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

const AuthenticatedZone = lazy(() => import("./AuthenticatedZone"))

const App: FC = () => {
  const {user, synced, hasInternet, authMethods, logout} = useAuthentication()

  if (user !== null) {
    if (!hasInternet || synced) {
      return (
        <IonApp>
          <WithItemTools>
            <AuthenticatedZone logout={logout}/>
          </WithItemTools>
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
