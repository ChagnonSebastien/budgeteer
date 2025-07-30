import { Chip, Stack, Tab, Tabs, Typography } from '@mui/material'
import { LegacyRef, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import AccountCard, { AdditionalAccountCardProps } from './AccountCard'
import ItemList, { ItemListProps } from './ItemList'
import Account, { AccountID } from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { SearchOverlay } from '../inputs/SearchOverlay'
import { DrawerContext } from '../Menu'
import { CustomScrollbarContainer } from '../shared/CustomScrollbarContainer'
import { Column, Row } from '../shared/NoteContainer'

type tabs = 'mine' | 'others'
const groupOther = 'Other'

type GroupedAccountListProps = {
  showZeroBalances?: boolean
  showGroupTotals?: boolean
  groupBy?: 'institution' | 'type'
  filterable?: boolean
  hideSearchOverlay?: boolean
  focusedAccount?: AccountID | null
  onFilteredAccountsChange?: (accounts: Account[]) => void
  scrollingContainerRef?: LegacyRef<HTMLDivElement> | undefined
}

type Props = ItemListProps<AccountID, Account, AdditionalAccountCardProps> & GroupedAccountListProps

const GroupedAccountList = (props: Props) => {
  const {
    items,
    selectConfiguration,
    additionalItemsProps,
    ItemComponent = AccountCard,

    scrollingContainerRef,
    filterable = false,
    showZeroBalances = false,
    groupBy = 'institution',
    showGroupTotals = false,
    onFilteredAccountsChange,
  } = props

  const { augmentedTransactions: transactions, accountBalances, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const [activeTab, setActiveTab] = useState<tabs>('mine')

  const myOwnAccounts = useMemo(() => items.filter((account) => account.isMine), [items])
  const otherAccounts = useMemo(() => items.filter((account) => !account.isMine), [items])

  const [filter, setFilter] = useState('')

  const filterAccounts = useCallback(
    (account: Account) => {
      if (filterable && filter !== '' && !account.name.toLowerCase().includes(filter.toLowerCase())) {
        return false
      }

      if (!showZeroBalances) {
        const balances = accountBalances?.get(account.id)
        if (!balances) return false
        if (!Array.from(balances.values()).some((balance) => balance !== 0)) return false
      }

      return true
    },
    [filterable, filter, items, showZeroBalances, accountBalances],
  )

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

    return ordered.filter(filterAccounts)
  }, [myOwnAccounts, transactions, filterAccounts])

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

    return ordered.filter(filterAccounts)
  }, [otherAccounts, transactions, filterAccounts])

  useEffect(() => {
    if (activeTab === 'mine' && myOwnOrderedAccounts.length === 0 && otherOrderedAccounts.length > 0)
      setActiveTab('others')
    if (activeTab === 'others' && otherOrderedAccounts.length === 0 && myOwnOrderedAccounts.length > 0)
      setActiveTab('mine')
  }, [activeTab, myOwnOrderedAccounts, otherOrderedAccounts])

  const displayedAccount = useMemo(() => {
    return activeTab === 'mine' ? myOwnOrderedAccounts : otherOrderedAccounts
  }, [myOwnOrderedAccounts, otherOrderedAccounts, activeTab])

  // Provide the filtered accounts in display order to the parent component
  useEffect(() => {
    if (onFilteredAccountsChange) {
      // Flatten all accounts in the order they are displayed
      const allDisplayedAccounts: Account[] = []

      // First add accounts from the active tab
      allDisplayedAccounts.push(...displayedAccount)

      // Then add accounts from the other tab if there are any
      if (activeTab === 'mine' && otherOrderedAccounts.length > 0) {
        allDisplayedAccounts.push(...otherOrderedAccounts)
      } else if (activeTab === 'others' && myOwnOrderedAccounts.length > 0) {
        allDisplayedAccounts.push(...myOwnOrderedAccounts)
      }

      onFilteredAccountsChange(allDisplayedAccounts)
    }
  }, [onFilteredAccountsChange, displayedAccount, myOwnOrderedAccounts, otherOrderedAccounts, activeTab])

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
            <Stack direction="row" spacing={1}>
              <Typography>My Accounts</Typography>
              {filterable && filter && <Chip label={myOwnOrderedAccounts.length} color="primary" size="small" />}
            </Stack>
          }
          value="mine"
        />
        <Tab
          label={
            <Stack direction="row" spacing={1}>
              <Typography>Third Parties</Typography>
              {filterable && filter && <Chip label={otherOrderedAccounts.length} color="primary" size="small" />}
            </Stack>
          }
          value="others"
        />
      </Tabs>
    )
  }, [myOwnAccounts, otherAccounts, activeTab, myOwnOrderedAccounts, otherOrderedAccounts, filterable, filter])

  const groups = Object.entries(
    displayedAccount.reduce(
      (groups, account) => {
        const groupKey = (groupBy === 'type' ? account.type : account.financialInstitution) || groupOther
        return { ...groups, [groupKey]: [...(groups[groupKey] || []), account] }
      },
      {} as Record<string, Account[]>,
    ),
  )

  const getTotal = (accounts: Account[]) => {
    const now = new Date()
    const total = accounts.reduce((sum, account) => {
      const balances = accountBalances?.get(account.id)
      if (!balances) return sum
      return Array.from(balances.entries()).reduce((acc, [currencyId, amount]) => {
        if (currencyId === defaultCurrency.id) return acc + amount
        return acc + amount * exchangeRateOnDay(currencyId, defaultCurrency.id, now)
      }, sum)
    }, 0)
    return Math.round(total)
  }

  return (
    <Column style={{ position: 'relative', height: '100%' }}>
      {segments}

      <CustomScrollbarContainer ref={scrollingContainerRef} style={{ paddingTop: '1rem', paddingBottom: '4rem' }}>
        {groups.map(([type, accounts]) => (
          <Column key={`account-group-${type}`} style={{ marginBottom: '2rem', gap: '0.75rem' }}>
            {type !== groupOther && (
              <>
                <Typography variant="subtitle1" textTransform="uppercase" color="textDisabled">
                  {type}
                </Typography>

                {showGroupTotals && (
                  <Row
                    style={{
                      paddingLeft: '0.5rem',
                      borderLeft: '2px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <Typography variant="subtitle2" fontFamily="monospace" color="textDisabled">
                      {formatFull(defaultCurrency, getTotal(accounts), privacyMode)}
                    </Typography>
                  </Row>
                )}
              </>
            )}

            <div
              style={{
                ...(additionalItemsProps.showBalances
                  ? {
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                      gap: '1rem',
                      padding: '0.25rem',
                    }
                  : {
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.1rem',
                    }),
              }}
            >
              <ItemList
                items={accounts}
                ItemComponent={ItemComponent}
                additionalItemsProps={additionalItemsProps}
                selectConfiguration={selectConfiguration}
                filter={filterAccounts}
              />
            </div>
          </Column>
        ))}
      </CustomScrollbarContainer>

      {filterable && <SearchOverlay filter={filter} setFilter={setFilter} placeholder="Search accounts..." />}
    </Column>
  )
}

export default GroupedAccountList
