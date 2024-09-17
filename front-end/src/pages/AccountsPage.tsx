import { useIonRouter } from '@ionic/react'
import { Button, Tab, Tabs } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { AccountList } from '../components/AccountList'
import ContentWithHeader from '../components/ContentWithHeader'
import Account from '../domain/model/account'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'

type tabs = 'mine' | 'others'

const AccountsPage: FC = () => {
  const router = useIonRouter()

  const { state: accounts } = useContext(AccountServiceContext)
  const { augmentedTransactions: transactions } = useContext(MixedAugmentation)

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

  const filteredAccounts = useMemo(() => {
    return activeTab === 'mine' ? myOwnOrderedAccounts : otherOrderedAccounts
  }, [myOwnOrderedAccounts, otherOrderedAccounts, activeTab])

  const segments = useMemo(() => {
    if (myOwnAccounts.length === 0 || otherAccounts.length === 0) return undefined

    return (
      <Tabs
        sx={{ backgroundColor: 'white', width: '100%' }}
        variant="fullWidth"
        value={activeTab}
        onChange={(_ev, value) => {
          if (value === 'mine') {
            setActiveTab('mine')
          } else if (value === 'others') {
            setActiveTab('others')
          }
        }}
      >
        <Tab label="My Accounts" value="mine" />
        <Tab label="Third Parties" value="others" />
      </Tabs>
    )
  }, [myOwnAccounts, otherAccounts, activeTab])

  return (
    <ContentWithHeader title="Accounts" button="menu">
      {segments}
      <AccountList accounts={filteredAccounts} onSelect={(id) => router.push(`/accounts/edit/${id}`)} showBalances />
      <div style={{ height: '1rem' }} />
      <Button onClick={() => router.push('/accounts/new')}>New</Button>
    </ContentWithHeader>
  )
}

export default AccountsPage
