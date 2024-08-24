import {
  IonButton, IonLabel,
  IonPage, IonSegment, IonSegmentButton,
  useIonRouter,
} from "@ionic/react"
import { FC, useContext, useMemo, useState } from "react"
import { AccountList } from "../components/AccountList"
import ContentWithHeader from "../components/ContentWithHeader"
import Account from "../domain/model/account"
import MixedAugmentation from "../service/MixedAugmentation"
import { AccountServiceContext, TransactionServiceContext } from "../service/ServiceContext"

type tabs = "mine" | "others"

const AccountsPage: FC = () => {
  const router = useIonRouter()

  const {state: accounts, myOwnAccounts, otherAccounts} = useContext(AccountServiceContext)
  const {state: transactions} = useContext(TransactionServiceContext)

  const [activeTab, setActiveTab] = useState<tabs>("mine")

  const myOwnOrderedAccounts = useMemo(() => {
    const visited = new Set<number>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      if (transaction.senderId !== null && !visited.has(transaction.senderId)) {
        const account = myOwnAccounts.find(a => a.id === transaction.senderId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.senderId)
        }
      }
      if (transaction.receiverId !== null && !visited.has(transaction.receiverId)) {
        const account = myOwnAccounts.find(a => a.id === transaction.receiverId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.receiverId)
        }
      }
    }

    return ordered
  }, [myOwnAccounts, transactions])

  const otherOrderedAccounts = useMemo(() => {
    const visited = new Set<number>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      if (transaction.senderId !== null && !visited.has(transaction.senderId)) {
        const account = otherAccounts.find(a => a.id === transaction.senderId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.senderId)
        }
      }
      if (transaction.receiverId !== null && !visited.has(transaction.receiverId)) {
        const account = otherAccounts.find(a => a.id === transaction.receiverId)
        if (typeof account !== "undefined") {
          ordered.push(account)
          visited.add(transaction.receiverId)
        }
      }
    }

    return ordered
  }, [otherAccounts, transactions])

  const filteredAccounts = useMemo(() => {
    return activeTab === "mine" ? myOwnOrderedAccounts : otherOrderedAccounts
  }, [myOwnOrderedAccounts, otherOrderedAccounts, activeTab])


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
                       onSelect={id => router.push(`/accounts/edit/${id}`)}
                       showBalances
          />
        </div>
      </ContentWithHeader>
    </IonPage>

  )
}

export default AccountsPage
