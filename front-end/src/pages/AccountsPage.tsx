import {
  IonButton, IonLabel,
  IonPage, IonSegment, IonSegmentButton,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext, useMemo, useState } from "react"
import { AccountList } from "../components/AccountList"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import { AccountServiceContext, TransactionServiceContext } from "../service/ServiceContext"

type tabs = "mine" | "others"

const AccountsPage: FC = () => {
  const router = useIonRouter()

  const {state: accounts} = useContext(AccountServiceContext)
  const {state: transactions} = useContext(TransactionServiceContext)

  const [activeTab, setActiveTab] = useState<tabs>("mine")

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

  const myAccounts = useMemo(() => {
    return orderedAccounts.filter(a => a.isMine)
  }, [orderedAccounts])

  const otherAccounts = useMemo(() => {
    return orderedAccounts.filter(a => !a.isMine)
  }, [orderedAccounts])

  const filteredAccounts = useMemo(() => {
    return activeTab === "mine" ? myAccounts : otherAccounts
  }, [myAccounts, otherAccounts, activeTab])

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
      <ContentWithHeader title="Accounts" button="menu" segments={(
        <IonSegment value={activeTab} onIonChange={ev => {
          if (ev.detail.value === "mine") {
            setActiveTab("mine")
          } else if (ev.detail.value === "others") {
            setActiveTab("others")
          }
        }}>
          <IonSegmentButton value="mine">
            <IonLabel>My accounts</IonLabel>
          </IonSegmentButton>
          <IonSegmentButton value="others">
            <IonLabel>Second parties</IonLabel>
          </IonSegmentButton>
        </IonSegment>
      )}>
        <div style={{margin: "1rem"}}>
          <IonButton expand="block" onClick={() => router.push("/accounts/new")}>
            New
          </IonButton>
          <div style={{height: "1rem"}}/>
          <AccountList accounts={filteredAccounts}
                       valuePerAccount={valuePerAccount}
                       onSelect={id => router.push(`/accounts/edit/${id}`)}/>
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default AccountsPage
