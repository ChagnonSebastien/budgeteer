import React, { FC, useContext, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { UserContext } from '../App'
import ItemList from '../components/accounts/ItemList'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column } from '../components/shared/Layout'
import ScrollingOverButton, { CustomScrolling } from '../components/shared/ScrollingOverButton'
import BalanceOverview, { CurrencyTotals } from '../components/transactionGroup/BalanceOverview'
import { GroupSummary, TransactionGroupCard } from '../components/transactionGroup/TransactionGroupCard'
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

  const orderedGroups = useMemo(
    () =>
      [...transactionGroups].sort(
        (a, b) => (lastActivity.get(b.id) ?? b.createdAt.getTime()) - (lastActivity.get(a.id) ?? a.createdAt.getTime()),
      ),
    [transactionGroups, lastActivity],
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

  const list = (
    <CustomScrolling
      ref={scrollingContainerRef}
      style={{
        overflowY: 'auto',
        flexGrow: 1,
        paddingBottom: '4rem',
        position: 'relative',
      }}
    >
      <Column style={{ gap: '1rem' }}>
        {totals.length > 0 && <BalanceOverview totals={totals} />}
        <ItemList
          items={orderedGroups}
          selectConfiguration={{
            mode: 'click',
            onClick: (clicked) => navigate(`/transaction-groups/manage/${clicked.id}`),
          }}
          ItemComponent={TransactionGroupCard}
          additionalItemsProps={{ summaries }}
        />
      </Column>
    </CustomScrolling>
  )

  return (
    <ContentWithHeader title="Transaction Groups" action="menu" withPadding>
      <ScrollingOverButton
        button={canCreate ? { text: 'New', onClick: () => navigate('/transaction-groups/new') } : undefined}
        scrollingContainerRef={scrollingContainerRef}
        contentStyle={{ maxWidth: '40rem' }}
      >
        {list}
      </ScrollingOverButton>
    </ContentWithHeader>
  )
}

export default TransactionGroups
