import {
  IonSpinner,
} from "@ionic/react"
import { FC } from "react"

const LoadingScreen: FC = () => (
  <div className="centered">
    <IonSpinner/>
  </div>
)

export default LoadingScreen
