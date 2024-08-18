import {
  IonButton,
  IonPage,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import { AccountList } from "../components/AccountList"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import { AccountServiceContext, TransactionServiceContext } from "../service/ServiceContext"


const AccountsPage: FC = () => {
  const router = useIonRouter()

  const {state: accounts} = useContext(AccountServiceContext)
  const {state: transactions} = useContext(TransactionServiceContext)

  const orderedAccounts = useMemo(() => {
    const visited = new Set<number>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      if (transaction.senderId !== null && !visited.has(transaction.senderId)) {
        const account = accounts.find(a => a.id === transaction.senderId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.senderId)
        }
      }
      if (transaction.receiverId !== null && !visited.has(transaction.receiverId)) {
        const account = accounts.find(a => a.id === transaction.receiverId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.receiverId)
        }
      }
    }

    return ordered
  }, [accounts, transactions])

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
          <AccountList accounts={orderedAccounts}
                       valuePerAccount={valuePerAccount}
                       onSelect={id => router.push(`/accounts/edit/${id}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default AccountsPage
