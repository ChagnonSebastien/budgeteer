import { Tab, Tabs } from '@mui/material'
import { Dispatch, Fragment, LegacyRef, SetStateAction, useContext, useEffect, useMemo, useState } from 'react'

import { AccountCard } from './AccountCard'
import Account, { AccountID } from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import { SearchOverlay } from '../inputs/SearchOverlay'
import { DrawerContext } from '../Menu'
import { CustomScrollbarContainer } from '../shared/CustomScrollbarContainer'

type Props = {
  accounts: Account[]
  onSelect?: (value: Account) => void
  selected?: AccountID[]
  onMultiSelect?: (value: AccountID[]) => void
  showBalances?: boolean
  showZeroBalances?: boolean
  showGroupTotals?: boolean
  groupBy?: 'institution' | 'type'
  filterable?: { filter: string; setFilter: Dispatch<SetStateAction<string>> }
  hideSearchOverlay?: boolean
  focusedAccount?: AccountID | null
  onFilteredAccountsChange?: (accounts: Account[]) => void
  scrollingContainerRef?: LegacyRef<HTMLDivElement> | undefined
}

type tabs = 'mine' | 'others'

export const AccountList = (props: Props) => {
  const { accounts, onSelect, showBalances = false, filterable, onMultiSelect, selected, scrollingContainerRef } = props

  const { augmentedTransactions: transactions, accountBalances, exchangeRateOnDay } = useContext(MixedAugmentation)
  const currencyContext = useContext(CurrencyServiceContext)
  const defaultCurrency = currencyContext.tentativeDefaultCurrency
  const { privacyMode } = useContext(DrawerContext)
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
    let filtered = myOwnOrderedAccounts

    if (typeof filterable !== 'undefined') {
      filtered = filtered.filter((account) => account.name.toLowerCase().includes(filterable.filter.toLowerCase()))
    }

    if (!props.showZeroBalances) {
      filtered = filtered.filter((account) => {
        const balances = accountBalances?.get(account.id)
        if (!balances) return false
        return Array.from(balances.values()).some((balance) => balance !== 0)
      })
    }

    return filtered
  }, [myOwnOrderedAccounts, filterable?.filter, props.showZeroBalances, accountBalances])

  const otherFilteredAccounts = useMemo(() => {
    let filtered = otherOrderedAccounts

    if (typeof filterable !== 'undefined') {
      filtered = filtered.filter((account) => account.name.toLowerCase().includes(filterable.filter.toLowerCase()))
    }

    if (!props.showZeroBalances) {
      filtered = filtered.filter((account) => {
        const balances = accountBalances?.get(account.id)
        if (!balances) return false
        return Array.from(balances.values()).some((balance) => balance !== 0)
      })
    }

    return filtered
  }, [otherOrderedAccounts, filterable?.filter, props.showZeroBalances, accountBalances])

  useEffect(() => {
    if (activeTab === 'mine' && myOwnFilteredAccounts.length === 0 && otherFilteredAccounts.length > 0)
      setActiveTab('others')
    if (activeTab === 'others' && otherFilteredAccounts.length === 0 && myOwnFilteredAccounts.length > 0)
      setActiveTab('mine')
  }, [activeTab, myOwnFilteredAccounts, otherFilteredAccounts])

  const displayedAccount = useMemo(() => {
    return activeTab === 'mine' ? myOwnFilteredAccounts : otherFilteredAccounts
  }, [myOwnFilteredAccounts, otherFilteredAccounts, activeTab])

  // Provide the filtered accounts in display order to the parent component
  useEffect(() => {
    if (props.onFilteredAccountsChange) {
      // Flatten all accounts in the order they are displayed
      const allDisplayedAccounts: Account[] = []

      // First add accounts from the active tab
      allDisplayedAccounts.push(...displayedAccount)

      // Then add accounts from the other tab if there are any
      if (activeTab === 'mine' && otherFilteredAccounts.length > 0) {
        allDisplayedAccounts.push(...otherFilteredAccounts)
      } else if (activeTab === 'others' && myOwnFilteredAccounts.length > 0) {
        allDisplayedAccounts.push(...myOwnFilteredAccounts)
      }

      props.onFilteredAccountsChange(allDisplayedAccounts)
    }
  }, [props.onFilteredAccountsChange, displayedAccount, myOwnFilteredAccounts, otherFilteredAccounts, activeTab])

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
        <Tab
          label={
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              My Accounts
              {filterable?.filter && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '0 8px',
                    fontSize: '0.75rem',
                    marginLeft: '0.5rem',
                    marginTop: '-0.5rem',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {myOwnFilteredAccounts.length}
                </div>
              )}
            </div>
          }
          value="mine"
        />
        <Tab
          label={
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              Third Parties
              {filterable?.filter && (
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '0 8px',
                    fontSize: '0.75rem',
                    marginLeft: '0.5rem',
                    marginTop: '-0.5rem',
                    minWidth: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {otherFilteredAccounts.length}
                </div>
              )}
            </div>
          }
          value="others"
        />
      </Tabs>
    )
  }, [myOwnAccounts, otherAccounts, activeTab, myOwnFilteredAccounts, otherFilteredAccounts, filterable?.filter])

  return (
    <div
      style={{
        minWidth: '20rem',
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div>{segments}</div>
      <CustomScrollbarContainer
        ref={scrollingContainerRef}
        style={{
          overflowY: 'auto',
          flexGrow: 1,
          paddingBottom: '4rem',
          position: 'relative',
        }}
      >
        {Object.entries(
          displayedAccount.reduce(
            (groups, account) => {
              const groupKey =
                props.groupBy === 'type' ? account.type || 'Other' : account.financialInstitution || 'Other'
              return { ...groups, [groupKey]: [...(groups[groupKey] || []), account] }
            },
            {} as Record<string, Account[]>,
          ),
        ).map(([type, accounts]) => (
          <Fragment key={`account-group-${type}`}>
            <div style={{ marginBottom: '2rem' }}>
              {type !== 'Other' && (
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    marginBottom: '1.5rem',
                    marginTop: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ fontSize: '0.85rem' }}>{type}</div>
                  <div
                    style={{
                      opacity: 0.8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      paddingLeft: '0.5rem',
                      borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    {(() => {
                      if (!defaultCurrency || privacyMode || !props.showGroupTotals) return null
                      const now = new Date()
                      const total = accounts.reduce((sum, account) => {
                        const balances = accountBalances?.get(account.id)
                        if (!balances) return sum
                        return Array.from(balances.entries()).reduce((acc, [currencyId, amount]) => {
                          if (currencyId === defaultCurrency.id) return acc + amount
                          return acc + amount * exchangeRateOnDay(currencyId, defaultCurrency.id, now)
                        }, sum)
                      }, 0)
                      if (total === 0) return null
                      return <div style={{ fontSize: '0.8rem' }}>{formatFull(defaultCurrency, Math.round(total))}</div>
                    })()}
                  </div>
                </div>
              )}
              <div
                style={{
                  ...(showBalances
                    ? {
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '1.5rem',
                        padding: '0.25rem',
                      }
                    : {
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }),
                  ...(type === 'Other' ? { marginTop: '1rem' } : {}),
                }}
              >
                {accounts.map((account) => (
                  <AccountCard
                    key={`account-list-${account.id}`}
                    account={account}
                    onSelect={onSelect ? () => onSelect(account) : undefined}
                    selected={selected}
                    onMultiSelect={onMultiSelect}
                    showBalances={showBalances}
                    focused={props.focusedAccount === account.id}
                  />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
      </CustomScrollbarContainer>
      {filterable && !props.hideSearchOverlay && (
        <SearchOverlay filter={filterable.filter} setFilter={filterable.setFilter} placeholder="Search accounts..." />
      )}
    </div>
  )
}
