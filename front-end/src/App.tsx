import {
  IonApp,
  IonButton,
  IonSpinner,
  setupIonicReact,
} from "@ionic/react"
import { WithItemTools } from "./components/IconTools"
import { FC, useContext } from "react"
import AuthenticatedZone from "./AuthenticatedZone"
import { AuthContext } from "./WithLogin"

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

setupIonicReact()

const App: FC = () => {
  const {user, synced, hasInternet, authMethods} = useContext(AuthContext)

  if (user !== null) {
    return (
      <IonApp>
        <WithItemTools>
          <AuthenticatedZone/>
        </WithItemTools>
      </IonApp>
    )
  }

  if (!hasInternet) {
    return <p>Internet connection required on first use</p>
  }

  if (authMethods.oidc === null) {
    return <p>Only OIDC is supported as of now</p>
  }

  return (
    <IonButton onClick={authMethods.oidc?.login}>
      {synced ? "OIDC Login" : <IonSpinner/>}
    </IonButton>
  )
}

export default App
