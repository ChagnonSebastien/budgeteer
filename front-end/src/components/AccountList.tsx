import { IonItem, IonLabel, IonSegment, IonSegmentButton } from '@ionic/react'
import { useContext, useEffect, useMemo, useState } from 'react'

import ContentWithHeader, { ContentWithHeaderProps } from './ContentWithHeader'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext, TransactionServiceContext } from '../service/ServiceContext'

type tabs = 'mine' | 'others'

type Props = {
  accounts: Account[]
  onSelect: (value: number) => void
  showBalances?: boolean
} & Omit<ContentWithHeaderProps, 'children'>

export const AccountList = (props: Props) => {
  const { accounts, onSelect, showBalances = false, ...headerProps } = props
  const { accountBalances } = useContext(MixedAugmentation)

  const { state: currencies } = useContext(CurrencyServiceContext)
  const { state: transactions } = useContext(TransactionServiceContext)

  const [activeTab, setActiveTab] = useState<tabs>('mine')
  const myOwnAccounts = useMemo(() => accounts.filter((account) => account.isMine), [accounts])
  const otherAccounts = useMemo(() => accounts.filter((account) => !account.isMine), [accounts])

  useEffect(() => {
    if (activeTab === 'mine' && myOwnAccounts.length === 0 && otherAccounts.length > 0) setActiveTab('others')
    if (activeTab === 'others' && otherAccounts.length === 0 && myOwnAccounts.length > 0) setActiveTab('mine')
  }, [activeTab, myOwnAccounts, otherAccounts])

  const myOwnOrderedAccounts = useMemo(() => {
    const visited = new Set<number>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      if (transaction.senderId !== null && !visited.has(transaction.senderId)) {
        const account = myOwnAccounts.find((a) => a.id === transaction.senderId)
        if (typeof account !== 'undefined') {
          ordered.push(account)
          visited.add(transaction.senderId)
        }
      }
      if (transaction.receiverId !== null && !visited.has(transaction.receiverId)) {
        const account = myOwnAccounts.find((a) => a.id === transaction.receiverId)
        if (typeof account !== 'undefined') {
          ordered.push(account)
          visited.add(transaction.receiverId)
        }
      }
    }

    for (const account of myOwnAccounts) {
      if (!visited.has(account.id)) {
        ordered.push(account)
      }
    }

    return ordered
  }, [myOwnAccounts, transactions])

  const otherOrderedAccounts = useMemo(() => {
    const visited = new Set<number>()
    const ordered = new Array<Account>()

    for (const transaction of transactions) {
      if (transaction.senderId !== null && !visited.has(transaction.senderId)) {
        const account = otherAccounts.find((a) => a.id === transaction.senderId)
        if (typeof account !== 'undefined') {
          ordered.push(account)
          visited.add(transaction.senderId)
        }
      }
      if (transaction.receiverId !== null && !visited.has(transaction.receiverId)) {
        const account = otherAccounts.find((a) => a.id === transaction.receiverId)
        if (typeof account !== 'undefined') {
          ordered.push(account)
          visited.add(transaction.receiverId)
        }
      }
    }

    for (const account of otherAccounts) {
      if (!visited.has(account.id)) {
        ordered.push(account)
      }
    }

    return ordered
  }, [otherAccounts, transactions])

  const segments = useMemo(() => {
    if (myOwnAccounts.length === 0 || otherAccounts.length === 0) return undefined

    return (
      <IonSegment
        value={activeTab}
        onIonChange={(ev) => {
          if (ev.detail.value === 'mine') {
            setActiveTab('mine')
          } else if (ev.detail.value === 'others') {
            setActiveTab('others')
          }
        }}
      >
        <IonSegmentButton value="mine">
          <IonLabel>My accounts</IonLabel>
        </IonSegmentButton>
        <IonSegmentButton value="others">
          <IonLabel>Second parties</IonLabel>
        </IonSegmentButton>
      </IonSegment>
    )
  }, [myOwnAccounts, otherAccounts, activeTab])

  const filteredAccounts = useMemo(() => {
    return activeTab === 'mine' ? myOwnOrderedAccounts : otherOrderedAccounts
  }, [myOwnOrderedAccounts, otherOrderedAccounts, activeTab])

  return (
    <ContentWithHeader {...headerProps} segments={segments}>
      {filteredAccounts.map((account) => {
        return (
          <IonItem key={`account-list-${account.id}`} onClick={() => onSelect(account.id)}>
            <div style={{ flexGrow: 1 }}>
              <div>{account.name}</div>
              {showBalances &&
                [...(accountBalances?.get(account.id)?.entries() ?? [])]
                  .filter((entry) => entry[1] !== 0)
                  .map((entry) => {
                    const currency = currencies.find((c) => c.id === entry[0])
                    if (typeof currency === 'undefined') {
                      return null
                    }

                    return (
                      <div key={`currency-in-account-${entry[0]}`} style={{ textAlign: 'right' }}>
                        {formatFull(currency, entry[1])}
                      </div>
                    )
                  })}
            </div>
          </IonItem>
        )
      })}
    </ContentWithHeader>
  )
}
