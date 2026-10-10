import { Checkbox, IconButton, Menu, MenuItem, Stack, useTheme } from '@mui/material'
import React, { FC, useContext, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext } from '../App'
import ItemList from '../components/accounts/ItemList'
import { IconToolsContext } from '../components/icons/IconTools'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import useQueryParams from '../components/shared/useQueryParams'
import BalanceOverview, { CurrencyTotals } from '../components/transactionGroup/BalanceOverview'
import { GroupSummary, TransactionGroupCard } from '../components/transactionGroup/TransactionGroupCard'
import TransactionGroupModal from '../components/transactionGroup/TransactionGroupModal'
import { useAugmentedTransactionGroups } from '../components/transactionGroup/useAugmentedTransactionGroup'
import {
  buildGroupTransactions,
  useGroupTransactionSources,
  userBalance,
} from '../components/transactionGroup/useGroupTransactions'
import { TransactionGroupID } from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

interface Props {
  // Guests have no currencies or categories, so they can join groups but not create them.
  canCreate?: boolean
}

const TransactionGroups: FC<Props> = ({ canCreate = true }) => {
  const theme = useTheme()
  const navigate = useNavigate()
  const { IconLib } = useContext(IconToolsContext)
  const { email } = useContext(UserContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const augmentedGroups = useAugmentedTransactionGroups()
  const sources = useGroupTransactionSources()

  const { summaries, lastActivity } = useMemo(() => {
    const summaries = new Map<TransactionGroupID, GroupSummary>()
    const lastActivity = new Map<TransactionGroupID, number>()
    for (const group of augmentedGroups) {
      const transactions = group.hasJoined(email) ? buildGroupTransactions(group, sources) : []
      if (group.hasJoined(email)) {
        summaries.set(group.id, {
          balance: userBalance(transactions, email),
          currency: group.augmentedCurrency,
          firstDate: transactions.at(-1)?.date ?? null,
          lastDate: transactions[0]?.date ?? null,
        })
      }
      lastActivity.set(group.id, (transactions[0]?.date ?? group.createdAt).getTime())
    }
    return { summaries, lastActivity }
  }, [augmentedGroups, sources, email])

  const { queryParams, updateQueryParams } = useQueryParams<{ showHidden: string }>()
  const showHidden = queryParams.showHidden === 'true'
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null)

  const orderedGroups = useMemo(
    () =>
      transactionGroups
        .filter((group) => showHidden || !group.hidden)
        .sort(
          (a, b) =>
            (lastActivity.get(b.id) ?? b.createdAt.getTime()) - (lastActivity.get(a.id) ?? a.createdAt.getTime()),
        ),
    [transactionGroups, lastActivity, showHidden],
  )

  // Groups can use different currencies with no shared exchange rate, so totals stay per currency.
  const totals = useMemo(() => {
    const byCurrency = new Map<string, CurrencyTotals>()
    for (const { balance, currency } of summaries.values()) {
      const total = byCurrency.get(currency.name) ?? { currency, owed: 0, owe: 0 }
      if (balance > 0) total.owed += balance
      else total.owe += balance
      byCurrency.set(currency.name, total)
    }
    return [...byCurrency.values()]
  }, [summaries])

  const scrollingContainerRef = useRef<HTMLDivElement>(null)
  const [clickedGroupId, setClickedGroupId] = useState<TransactionGroupID | null>(null)
  const clickedGroup = transactionGroups.find((g) => g.id === clickedGroupId)

  const list = (
    <CustomScrolling
      ref={scrollingContainerRef}
      style={{
        overflowY: 'auto',
        flexGrow: 1,
        paddingBottom: theme.spacing(8),
        position: 'relative',
      }}
    >
      <Stack sx={{ gap: 2 }}>
        {totals.length > 0 && <BalanceOverview totals={totals} />}
        <ItemList
          items={orderedGroups}
          selectConfiguration={{
            mode: 'click',
            onClick: (clicked) => setClickedGroupId(clicked.id),
          }}
          ItemComponent={TransactionGroupCard}
          additionalItemsProps={{ summaries }}
        />
      </Stack>
    </CustomScrolling>
  )

  return (
    <ContentWithHeader
      title="Transaction Groups"
      action="menu"
      withPadding
      rightContent={
        <>
          <IconButton aria-label="list settings" onClick={(e) => setSettingsAnchor(e.currentTarget)}>
            <IconLib.MdSettings size="1.5rem" />
          </IconButton>
          <Menu anchorEl={settingsAnchor} open={settingsAnchor !== null} onClose={() => setSettingsAnchor(null)}>
            <MenuItem
              onClick={() => {
                updateQueryParams({ showHidden: (!showHidden).toString() })
                setSettingsAnchor(null)
              }}
              sx={{ gap: 1 }}
            >
              <Checkbox checked={showHidden} size="small" />
              Show hidden groups
            </MenuItem>
          </Menu>
        </>
      }
    >
      <ScrollingOverButton
        button={canCreate ? { text: 'New', onClick: () => navigate('/transaction-groups/new') } : undefined}
        scrollingContainerRef={scrollingContainerRef}
        contentWidth="medium"
      >
        {list}
      </ScrollingOverButton>
      {clickedGroup && (
        <TransactionGroupModal
          group={clickedGroup}
          summary={summaries.get(clickedGroup.id)}
          onClose={() => setClickedGroupId(null)}
        />
      )}
    </ContentWithHeader>
  )
}

export default TransactionGroups
