import { Typography } from '@mui/material'
import { FC, ReactNode, useCallback, useContext, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { FirstDivision, GroupLedgerEntry, GroupPaidTable, SecondDivision } from './GroupLedger'
import GroupMembers from './GroupMembers'
import { AugmentedTransaction } from '../../domain/model/transaction'
import { AugmentedTransactionGroup } from '../../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import { UnconfirmedTransactionServiceContext } from '../../service/ServiceContext'
import ContentWithHeader from '../shared/ContentWithHeader'
import { Row } from '../shared/Layout'
import SplitView from '../shared/SplitView'
import { useElementDimensions } from '../shared/useDimensions'
import GroupTransactionCard from '../transactions/GroupTransactionCard'
import { TransactionList } from '../transactions/TransactionList'

const TransactionGroupView: FC<{
  transactionGroup: AugmentedTransactionGroup
  confirmedTransactions: AugmentedTransaction[]
  actions: ReactNode
}> = ({ transactionGroup, confirmedTransactions, actions }) => {
  const navigate = useNavigate()
  const { state: unconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)

  const groupTransactions = useMemo(
    () =>
      [
        ...confirmedTransactions,
        ...unconfirmedTransactions
          .filter((ut) => ut.transactionGroupId === transactionGroup.id)
          .map((ut) => new UnconfirmedAugmentedTransaction(ut, transactionGroup)),
      ].sort((a, b) => {
        if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
        return b.id - a.id
      }),
    [confirmedTransactions, unconfirmedTransactions, transactionGroup],
  )

  // Unconfirmed count toward totals: a guest's expenses can never be promoted.
  const paidEntries = useMemo<GroupLedgerEntry[]>(
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

  const openTransaction = useCallback(
    (transactionId: number) => {
      const transaction = groupTransactions.find((t) => t.id === transactionId)
      if (transaction instanceof UnconfirmedAugmentedTransaction) {
        navigate(`/transaction-groups/manage/${transactionGroup.id}/unconfirmed/${transaction.unconfirmed.id}`)
      }
    },
    [groupTransactions, navigate, transactionGroup.id],
  )

  const { width: contentWidth, ref: setContentRef } = useElementDimensions(600, 600)
  const splitHorizontal = contentWidth > 1200

  return (
    <ContentWithHeader title="Manage transaction group" action="menu" setContentRef={setContentRef}>
      <SplitView
        split={splitHorizontal ? 'horizontal' : 'vertical'}
        first={
          <FirstDivision>
            <Typography variant="h1" fontSize="2rem">
              {transactionGroup.name}
            </Typography>
            <GroupMembers transactionGroup={transactionGroup} style={{ justifyContent: 'end', alignSelf: 'stretch' }} />
            <GroupPaidTable
              members={transactionGroup.members}
              entries={paidEntries}
              currency={transactionGroup.augmentedCurrency}
            />
            <Row style={{ marginTop: '1rem', gap: '.5rem' }}>{actions}</Row>
          </FirstDivision>
        }
        firstZoneStyling={{ scroll: true, grow: false }}
        second={
          <SecondDivision>
            {groupTransactions.length === 0 ? (
              <Typography color="textDisabled" alignSelf="center">
                No payments yet
              </Typography>
            ) : (
              <TransactionList
                items={groupTransactions}
                ItemComponent={GroupTransactionCard}
                additionalItemsProps={{}}
                onClick={openTransaction}
                containerStyle={{ width: '100%', maxWidth: '32rem' }}
              />
            )}
          </SecondDivision>
        }
        secondZoneStyling={{ scroll: true, grow: true }}
      />
    </ContentWithHeader>
  )
}

export default TransactionGroupView
