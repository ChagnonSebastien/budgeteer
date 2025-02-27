import { Tab, Tabs } from '@mui/material'
import { Dispatch, Fragment, SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'

import { AccountCard } from './AccountCard'
import { DrawerContext } from './Menu'
import { SearchOverlay } from './SearchOverlay'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

import '../styles/account-list-tailwind.css'

const AccountListContainer = styled.div`
  min-width: 20rem;
  max-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`

const ScrollableContent = styled.div`
  overflow-y: auto;
  flex-grow: 1;
  padding-bottom: 4rem;
  position: relative;
`

const GroupHeader = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  margin-bottom: 1.5rem;
  margin-top: 1rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`

const GroupName = styled.div`
  font-size: 0.85rem;
`

const GroupTotal = styled.div`
  opacity: 0.8;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-left: 0.5rem;
  border-left: 2px solid rgba(255, 255, 255, 0.1);
`

const TotalAmount = styled.div`
  font-size: 0.8rem;
`

const TabLabel = styled.div`
  display: inline-flex;
  align-items: center;
  position: relative;
`

const TabCounter = styled.div`
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0 8px;
  font-size: 0.75rem;
  margin-left: 0.5rem;
  margin-top: -0.5rem;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`

type Props = {
  accounts: Account[]
  onSelect?: (value: Account) => void
  selected?: number[]
  onMultiSelect?: (value: number[]) => void
  showBalances?: boolean
  showZeroBalances?: boolean
  showGroupTotals?: boolean
  groupBy?: 'institution' | 'type'
  filterable?: { filter: string; setFilter: Dispatch<SetStateAction<string>> }
  onScrollProgress?: (progress: number) => void
}

type tabs = 'mine' | 'others'

export const AccountList = (props: Props) => {
  const { accounts, onSelect, showBalances = false, filterable, onMultiSelect, selected } = props

  const { augmentedTransactions: transactions, accountBalances, exchangeRateOnDay } = useContext(MixedAugmentation)
  const currencyContext = useContext(CurrencyServiceContext)
  const defaultCurrency = currencyContext.defaultCurrency
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
            <TabLabel>
              My Accounts
              {filterable?.filter && <TabCounter>{myOwnFilteredAccounts.length}</TabCounter>}
            </TabLabel>
          }
          value="mine"
        />
        <Tab
          label={
            <TabLabel>
              Third Parties
              {filterable?.filter && <TabCounter>{otherFilteredAccounts.length}</TabCounter>}
            </TabLabel>
          }
          value="others"
        />
      </Tabs>
    )
  }, [myOwnAccounts, otherAccounts, activeTab, myOwnFilteredAccounts, otherFilteredAccounts, filterable?.filter])

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!props.onScrollProgress || !contentRef.current) return

    const handleScroll = () => {
      const element = contentRef.current
      if (element) {
        const maxScroll = element.scrollHeight - element.clientHeight
        const bufferZone = 64 // 4rem
        if (maxScroll <= 0) {
          props.onScrollProgress?.(0)
        } else {
          const remainingScroll = maxScroll - element.scrollTop
          if (remainingScroll > bufferZone) {
            props.onScrollProgress?.(1)
          } else {
            const progress = remainingScroll / bufferZone
            props.onScrollProgress?.(Math.max(0, Math.min(1, progress)))
          }
        }
      }
    }

    handleScroll()
    contentRef.current.addEventListener('scroll', handleScroll)
    const observer = new ResizeObserver(handleScroll)
    observer.observe(contentRef.current)

    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('scroll', handleScroll)
      }
      observer.disconnect()
    }
  }, [props.onScrollProgress, displayedAccount])

  return (
    <AccountListContainer>
      <div>{segments}</div>
      <ScrollableContent ref={contentRef} className="custom-scrollbar">
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
            <div className="mb-8">
              {type !== 'Other' && (
                <GroupHeader>
                  <GroupName>{type}</GroupName>
                  <GroupTotal>
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
                      return <TotalAmount>{formatFull(defaultCurrency, Math.round(total))}</TotalAmount>
                    })()}
                  </GroupTotal>
                </GroupHeader>
              )}
              <div
                className={`${showBalances ? 'grid grid-cols-[repeat(auto-fill,minmax(350px,1fr))] gap-6' : 'flex flex-col gap-1'} ${type === 'Other' ? 'mt-4' : ''} ${showBalances ? 'p-1' : ''}`}
              >
                {accounts.map((account) => (
                  <AccountCard
                    key={`account-list-${account.id}`}
                    account={account}
                    onSelect={onSelect ? () => onSelect(account) : undefined}
                    selected={selected}
                    onMultiSelect={onMultiSelect}
                    showBalances={showBalances}
                  />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
      </ScrollableContent>
      {filterable && (
        <SearchOverlay filter={filterable.filter} setFilter={filterable.setFilter} placeholder="Search accounts..." />
      )}
    </AccountListContainer>
  )
}
