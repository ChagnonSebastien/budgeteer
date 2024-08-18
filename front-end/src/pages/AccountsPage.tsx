import {
  IonButton,
  IonPage,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import { AccountList } from "../components/AccountList"
import ContentWithHeader from "../components/ContentWithHeader"
import { AccountServiceContext, CurrencyServiceContext, TransactionServiceContext } from "../service/ServiceContext"


const AccountsPage: FC = () => {
  const router = useIonRouter()

  const {state: accounts} = useContext(AccountServiceContext)
  const {state: transactions} = useContext(TransactionServiceContext)

  const valuePerAccount = useMemo(() => {
    const accountAmounts = new Map<number, Map<number, number>>()

    for (const account of accounts) {
      const initialAmounts = new Map()
      for (const balance of account.initialAmounts) {
        initialAmounts.set(balance.currencyId, balance.value)
      }
      accountAmounts.set(account.id, initialAmounts)
    }

    for (const transaction of transactions) {
      if (transaction.senderId) {
        let currencyMap = accountAmounts.get(transaction.senderId)
        if (!currencyMap) {
          currencyMap = new Map()
          accountAmounts.set(transaction.senderId, currencyMap)
        }

        currencyMap.set(transaction.currencyId, (currencyMap.get(transaction.currencyId) ?? 0) - transaction.amount)
      }

      if (transaction.receiverId) {
        let currencyMap = accountAmounts.get(transaction.receiverId)
        if (!currencyMap) {
          currencyMap = new Map()
          accountAmounts.set(transaction.receiverId, currencyMap)
        }
        currencyMap.set(transaction.currencyId, (currencyMap.get(transaction.currencyId) ?? 0) + transaction.amount)
      }
    }

    return accountAmounts
  }, [accounts, transactions])

  return (
    <IonPage>
      <ContentWithHeader title="Accounts" button="menu">
        <div style={{margin: "1rem"}}>
          <IonButton expand="block" onClick={() => router.push("/accounts/new")}>
            New
          </IonButton>
          <div style={{height: "1rem"}}/>
          <AccountList accounts={accounts} valuePerAccount={valuePerAccount}
                       onSelect={id => router.push(`/accounts/edit/${id}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default AccountsPage
