import { Fab, Tab, Tabs, TextField } from '@mui/material'
import { Dispatch, Fragment, SetStateAction, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { AccountCard } from './AccountCard'
import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

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
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const [showSearch, setShowSearch] = useState(false)

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
            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
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
            <div style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
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

  useEffect(() => {
    const handleEscape = (ev: KeyboardEvent) => {
      if ((ev.key === 'Escape' || ev.key === 'Enter') && showSearch) {
        setShowSearch(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showSearch])

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
      <div ref={contentRef} style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '4rem', position: 'relative' }}>
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
                  display: showBalances ? 'grid' : 'flex',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  flexDirection: 'column',
                  gap: showBalances ? '1.5rem' : '0.25rem',
                  marginTop: type === 'Other' ? '1rem' : 0,
                }}
              >
                {accounts.map((account) => (
                  <AccountCard
                    key={`account-list-${account.id}`}
                    account={account}
                    onSelect={onSelect}
                    selected={selected}
                    onMultiSelect={onMultiSelect}
                    showBalances={showBalances}
                  />
                ))}
              </div>
            </div>
          </Fragment>
        ))}
      </div>
      {filterable && !showSearch && (
        <Fab
          color="primary"
          size="medium"
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '2rem',
            zIndex: 1000,
          }}
          onClick={() => setShowSearch(true)}
        >
          <IconLib.BiSearch style={{ fontSize: '1.5rem' }} />
        </Fab>
      )}
      {filterable && showSearch && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
          onClick={() => setShowSearch(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '600px',
              backgroundColor: '#424242',
              borderRadius: '8px',
              padding: '1rem',
              cursor: 'default',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <TextField
              autoFocus
              fullWidth
              size="medium"
              placeholder="Search accounts..."
              value={filterable.filter}
              onChange={(ev) => filterable.setFilter(ev.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <IconLib.IoCloseCircle
                      style={{ cursor: 'pointer', opacity: 0.7 }}
                      onClick={() => {
                        filterable.setFilter('')
                        setShowSearch(false)
                      }}
                    />
                  ),
                },
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
