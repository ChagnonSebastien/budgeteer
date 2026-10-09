import { Button, Chip, Typography } from '@mui/material'
import { FC, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Row } from '../components/shared/Layout'
import {
  FirstDivision,
  GroupLedgerEntry,
  GroupPaidTable,
  groupCurrency,
  SecondDivision,
} from '../components/transactionGroup/GroupLedger'
import JoinTransactionGroup from '../components/transactionGroup/JoinTransactionGroup'
import GroupTransactionCard from '../components/transactions/GroupTransactionCard'
import { TransactionList } from '../components/transactions/TransactionList'
import { AugmentedTransaction, AugmentedTransactionGroupData } from '../domain/model/transaction'
import { AugmentedTransactionGroup } from '../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../domain/model/unconfirmedTransaction'
import {
  CategoryServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../service/ServiceContext'

type Params = {
  transactionGroupId: string
}

const GuestTransactionGroupPage: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { state: ownTransactions, transactionsFromGroupMembers } = useContext(TransactionServiceContext)
  const { state: unconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)
  // Only satisfies AugmentedTransactionGroup: guests never promote, the one use of the group category.
  const { tentativeRoot: rootCategory } = useContext(CategoryServiceContext)

  const id = parseInt(transactionGroupId!)

  const transactionGroup = useMemo(() => {
    const group = transactionGroups.find((tg) => tg.id === id)
    if (!group || !rootCategory) return undefined
    return new AugmentedTransactionGroup(group, groupCurrency(group), rootCategory)
  }, [transactionGroups, id, rootCategory])

  const groupTransactions = useMemo(() => {
    if (!transactionGroup) return []
    const currency = transactionGroup.augmentedCurrency
    return [
      ...[...ownTransactions, ...transactionsFromGroupMembers]
        .filter((t) => t.transactionGroupData?.transactionGroupId === id)
        .map(
          (t) =>
            new AugmentedTransaction(
              t,
              null,
              new AugmentedTransactionGroupData(t.transactionGroupData!, transactionGroup),
              currency,
              currency,
            ),
        ),
      ...unconfirmedTransactions
        .filter((ut) => ut.transactionGroupId === id)
        .map((ut) => new UnconfirmedAugmentedTransaction(ut, transactionGroup)),
    ].sort((a, b) => {
      if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
      return b.id - a.id
    })
  }, [ownTransactions, transactionsFromGroupMembers, unconfirmedTransactions, id, transactionGroup])

  const entries = useMemo<GroupLedgerEntry[]>(
    () =>
      groupTransactions.map((t) => ({
        key: `transaction-${t.id}`,
        id: t.id,
        owner: t.owner,
        amount: t.amount,
        date: t.date,
        note: t.note,
        unconfirmed: t instanceof UnconfirmedAugmentedTransaction,
      })),
    [groupTransactions],
  )

  const openTransaction = (transactionId: number) => {
    const transaction = groupTransactions.find((t) => t.id === transactionId)
    if (transaction instanceof UnconfirmedAugmentedTransaction) {
      navigate(`/transaction-groups/manage/${id}/unconfirmed/${transaction.unconfirmed.id}`)
    }
  }

  if (!transactionGroup) {
    return <LoadingScreen />
  }

  if (!transactionGroup.members.find((m) => m.email === email)?.joined) {
    return (
      <ContentWithHeader title="Join transaction group" action="menu" withPadding withScrolling>
        <JoinTransactionGroup transactionGroup={transactionGroup} />
      </ContentWithHeader>
    )
  }

  return (
    <ContentWithHeader title={transactionGroup.name} action="menu" withScrolling>
      <FirstDivision>
        <Row style={{ flexWrap: 'wrap', gap: '.5rem', justifyContent: 'center' }}>
          {transactionGroup.members.map((member) => (
            <Chip key={member.email} label={member.name} variant={member.joined ? 'filled' : 'outlined'} />
          ))}
        </Row>
        <GroupPaidTable
          members={transactionGroup.members}
          entries={entries}
          currency={transactionGroup.augmentedCurrency}
        />
        <Button
          variant="contained"
          style={{ marginTop: '1rem' }}
          onClick={() => navigate(`/transaction-groups/manage/${transactionGroup.id}/unconfirmed/new`)}
        >
          Record a payment
        </Button>
      </FirstDivision>
      <SecondDivision>
        {groupTransactions.length === 0 ? (
          <Typography color="textDisabled">No payments yet</Typography>
        ) : (
          <TransactionList
            items={groupTransactions}
            ItemComponent={GroupTransactionCard}
            additionalItemsProps={{}}
            onClick={openTransaction}
          />
        )}
      </SecondDivision>
    </ContentWithHeader>
  )
}

export default GuestTransactionGroupPage
