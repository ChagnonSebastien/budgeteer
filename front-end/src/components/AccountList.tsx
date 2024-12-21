import { ListItemButton, Tab, Tabs, TextField } from '@mui/material'
import { Dispatch, SetStateAction, useContext, useEffect, useMemo, useState } from 'react'

import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Props = {
  accounts: Account[]
  onSelect: (value: Account) => void
  showBalances?: boolean
  filterable?: { filter: string; setFilter: Dispatch<SetStateAction<string>> }
}

type tabs = 'mine' | 'others'

export const AccountList = (props: Props) => {
  const { accounts, onSelect, showBalances = false, filterable } = props
  const { accountBalances } = useContext(MixedAugmentation)
  const { anonymity } = useContext(DrawerContext)

  const { state: currencies } = useContext(CurrencyServiceContext)

  const { augmentedTransactions: transactions } = useContext(MixedAugmentation)

  const [activeTab, setActiveTab] = useState<tabs>('mine')
  const myOwnAccounts = useMemo(() => accounts.filter((account) => account.isMine), [accounts])
  const otherAccounts = useMemo(() => accounts.filter((account) => !account.isMine), [accounts])

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

  const myOwnFilteredAccounts = useMemo(() => {
    if (typeof filterable === 'undefined') return myOwnOrderedAccounts
    return myOwnOrderedAccounts.filter((account) =>
      account.name.toLowerCase().includes(filterable.filter.toLowerCase()),
    )
  }, [myOwnOrderedAccounts, filterable?.filter])

  const otherFilteredAccounts = useMemo(() => {
    if (typeof filterable === 'undefined') return otherOrderedAccounts
    return otherOrderedAccounts.filter((account) =>
      account.name.toLowerCase().includes(filterable.filter.toLowerCase()),
    )
  }, [otherOrderedAccounts, filterable?.filter])

  useEffect(() => {
    if (activeTab === 'mine' && myOwnFilteredAccounts.length === 0 && otherFilteredAccounts.length > 0)
      setActiveTab('others')
    if (activeTab === 'others' && otherFilteredAccounts.length === 0 && myOwnFilteredAccounts.length > 0)
      setActiveTab('mine')
  }, [activeTab, myOwnFilteredAccounts, otherFilteredAccounts])

  const displayedAccount = useMemo(() => {
    return activeTab === 'mine' ? myOwnFilteredAccounts : otherFilteredAccounts
  }, [myOwnFilteredAccounts, otherFilteredAccounts, activeTab])

  const segments = useMemo(() => {
    if (myOwnAccounts.length === 0 || otherAccounts.length === 0) return undefined

    return (
      <Tabs
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
    <div style={{ minWidth: '25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {filterable && (
        <TextField
          autoFocus
          label="Filter"
          variant="standard"
          fullWidth
          value={filterable.filter}
          onChange={(ev) => filterable.setFilter(ev.target.value)}
        />
      )}
      {segments}
      <div style={{ overflowY: 'scroll', flexGrow: 1 }}>
        {displayedAccount.map((account) => {
          return (
            <ListItemButton key={`account-list-${account.id}`} onClick={() => onSelect(account)}>
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
                          {formatFull(currency, entry[1], anonymity)}
                        </div>
                      )
                    })}
              </div>
            </ListItemButton>
          )
        })}
      </div>
    </div>
  )
}
