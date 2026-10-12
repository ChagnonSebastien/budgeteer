import { Checkbox, IconButton, Menu, MenuItem, Stack } from '@mui/material'
import React, { FC, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext } from '../App'
import ItemList from '../components/accounts/ItemList'
import { IconToolsContext } from '../components/icons/IconTools'
import ActionSpeedDial from '../components/shared/ActionSpeedDial'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { CustomScrolling } from '../components/shared/CustomScrolling'
import useCloseOnBack from '../components/shared/useCloseOnBack'
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
  useCloseOnBack(settingsAnchor !== null, () => setSettingsAnchor(null))

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

  const [clickedGroupId, setClickedGroupId] = useState<TransactionGroupID | null>(null)
  const clickedGroup = transactionGroups.find((g) => g.id === clickedGroupId)

  const list = (
    <CustomScrolling sx={{ width: '100%', height: '100%', maxWidth: (t) => t.contentWidth.medium, pb: 11 }}>
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
      title="Shared expenses"
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
      {list}
      {canCreate && (
        <ActionSpeedDial
          ariaLabel="Create transaction group"
          actions={[
            {
              label: 'New group',
              Icon: IconLib.FaPlus,
              color: 'primary.main',
              onClick: () => navigate('/transaction-groups/new'),
            },
          ]}
        />
      )}
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
