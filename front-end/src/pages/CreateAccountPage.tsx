import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext } from "react"
import AccountForm from "../components/AccountForm"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import { AccountServiceContext } from "../service/ServiceContext"

const CreateAccountPage: FC = () => {
  const router = useIonRouter()

  const {create: createAccount} = useContext(AccountServiceContext)

  const onSubmit = useCallback(async (data: Omit<Account, "id">) => {
    await createAccount(data)
    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/accounts", "back", "replace")
    }
  }, [])

  return (
    <IonPage>
      <ContentWithHeader title="Create new account" button="return">
        <div style={{padding: "1rem"}}>
          <AccountForm
            onSubmit={onSubmit}
            submitText="Create"
          />
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default CreateAccountPage
