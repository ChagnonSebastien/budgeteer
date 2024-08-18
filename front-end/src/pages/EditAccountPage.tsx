import {
  IonPage, useIonRouter,
} from "@ionic/react"
import { FC, useCallback, useContext, useMemo } from "react"
import { useParams } from "react-router"
import AccountForm from "../components/AccountForm"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import { AccountServiceContext } from "../service/ServiceContext"

interface Params {
  accountId: string
}

const EditAccountPage: FC = () => {
  const router = useIonRouter()

  const {accountId} = useParams<Params>()
  const {state: accounts, update: updateAccount} = useContext(AccountServiceContext)
  const selectedAccount = useMemo(() => accounts.find(c => c.id === parseInt(accountId)), [accounts, accountId])

  const onSubmit = useCallback(async (data: Omit<Account, "id">) => {
    if (typeof selectedAccount === "undefined") return

    await updateAccount(selectedAccount!.id, data)

    if (router.canGoBack()) {
      router.goBack()
    } else {
      router.push("/accounts", "back", "replace")
    }
  }, [updateAccount, selectedAccount])

  if (typeof selectedAccount === "undefined") {
    router.push("/accounts", "back", "replace")
    return null
  }

  return (
    <IonPage>
      <ContentWithHeader title="Edit account" button="return">
        <div style={{padding: "1rem"}}>
          <AccountForm
            onSubmit={onSubmit}
            submitText="Save changes"
            initialAccount={selectedAccount}
          />
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default EditAccountPage
