import { Button, Chip, IconButton, Typography } from '@mui/material'
import React, { FC, useCallback, useContext, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import { IconToolsContext } from '../components/icons/IconTools'
import PersonPicker from '../components/inputs/PersonPicker'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions } from '../components/shared/useDimensions'
import {
  FirstDivision,
  GroupLedgerEntry,
  GroupPaidTable,
  SecondDivision,
} from '../components/transactionGroup/GroupLedger'
import JoinTransactionGroup from '../components/transactionGroup/JoinTransactionGroup'
import GroupTransactionCard from '../components/transactions/GroupTransactionCard'
import { TransactionList } from '../components/transactions/TransactionList'
import { Email, Person } from '../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../domain/model/unconfirmedTransaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { TransactionGroupServiceContext, UnconfirmedTransactionServiceContext } from '../service/ServiceContext'

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

type Params = {
  transactionGroupId: string
}

const ManageTransactionGroup: FC = () => {
  const { transactionGroupId } = useParams<Params>()
  const navigate = useNavigate()

  const { email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const { state: rawTransactionGroups, update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)
  const { state: unconfirmedTransactions } = useContext(UnconfirmedTransactionServiceContext)
  const {
    augmentedTransactions: transactions,
    augmentedTransactionsFromGroupMembers: transactionsFromGroupMembers,
    augmentedTransactionGroups: transactionGroups,
  } = useContext(MixedAugmentation)

  const id = parseInt(transactionGroupId!)

  const rawTransactionGroup = useMemo(() => rawTransactionGroups.find((t) => t.id === id), [rawTransactionGroups, id])
  const selectedTransactionGroup = useMemo(() => transactionGroups.find((t) => t.id === id), [transactionGroups, id])

  const groupTransactions = useMemo(
    () =>
      [
        ...transactions.filter(
          (t) =>
            t.transactionGroupData?.transactionGroupId === selectedTransactionGroup?.id && t.getType() === 'expense',
        ),
        // Other members' transactions have no category or accounts, so getType() can't classify them.
        ...transactionsFromGroupMembers.filter(
          (t) => t.transactionGroupData?.transactionGroupId === selectedTransactionGroup?.id,
        ),
        ...(selectedTransactionGroup
          ? unconfirmedTransactions
              .filter((ut) => ut.transactionGroupId === selectedTransactionGroup.id)
              .map((ut) => new UnconfirmedAugmentedTransaction(ut, selectedTransactionGroup))
          : []),
      ].sort((a, b) => {
        if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
        return b.id - a.id
      }),
    [selectedTransactionGroup, transactions, transactionsFromGroupMembers, unconfirmedTransactions],
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
        navigate(`/transaction-groups/manage/${id}/unconfirmed/${transaction.unconfirmed.id}`)
      }
    },
    [groupTransactions, navigate, id],
  )

  const { width: contentWidth, ref: setContentRef } = useElementDimensions(600, 600)
  const splitHorizontal = useMemo(() => contentWidth > 1200, [contentWidth])

  const addUserToGroup = useCallback(
    ({ existing, id, name }: { existing: boolean; id: Email | null; name: string }) => {
      if (typeof selectedTransactionGroup === 'undefined') return
      const currentMembers = selectedTransactionGroup.members
      const email = existing ? id! : name
      const personAlreadyIsMember = currentMembers.findIndex((m) => m.email === email) !== -1
      if (personAlreadyIsMember) {
        throw new Error(`${email} already is a member of this transaction group`)
      }

      updateTransactionGroup(
        { id: selectedTransactionGroup!.id },
        { members: [...currentMembers, new Person(email, name, null, false)] },
      )
    },
    [selectedTransactionGroup, updateTransactionGroup],
  )

  const removeUserFromGroup = useCallback(
    (email: string) => {
      if (typeof selectedTransactionGroup === 'undefined') return

      updateTransactionGroup(
        { id: selectedTransactionGroup!.id },
        { members: selectedTransactionGroup.members.filter((m) => m.email !== email) },
      )
    },
    [selectedTransactionGroup, updateTransactionGroup],
  )

  if (rawTransactionGroup && !rawTransactionGroup.members.find((m) => m.email === email)?.joined) {
    return (
      <ContentWithHeader title="Join transaction group" action="menu" withPadding withScrolling>
        <JoinTransactionGroup transactionGroup={rawTransactionGroup} />
      </ContentWithHeader>
    )
  }

  if (!selectedTransactionGroup) {
    return <LoadingScreen />
  }

  return (
    <ContentWithHeader title={`Manage transaction group`} action="menu" setContentRef={setContentRef}>
      <SplitView
        split={splitHorizontal ? 'horizontal' : 'vertical'}
        first={
          <FirstDivision>
            <Typography variant="h1" fontSize="2rem">
              {selectedTransactionGroup.name}
            </Typography>
            <Row style={{ justifyContent: 'end', alignSelf: 'stretch', alignItems: 'center', gap: '.5rem' }}>
              <PersonPicker
                onPersonSelected={addUserToGroup}
                OverrideTextLabel={({ onClick }) => (
                  <IconButton aria-label="add someone to transaction group" onClick={onClick}>
                    <IconLib.BsPlusCircle />
                  </IconButton>
                )}
                allowNew
                value={null}
                labelText={''}
                validateNewItemString={(s: string) => emailRegex.test(s)}
              />
              {selectedTransactionGroup.members.map((member) => (
                <Chip
                  key={member.email}
                  label={member.name}
                  onDelete={member.joined ? undefined : () => removeUserFromGroup(member.email)}
                />
              ))}
            </Row>
            <GroupPaidTable
              members={selectedTransactionGroup.members}
              entries={paidEntries}
              currency={selectedTransactionGroup.augmentedCurrency}
            />
            <Row style={{ marginTop: '1rem', gap: '.5rem' }}>
              <Button
                variant="outlined"
                onClick={() =>
                  navigate('/transactions/new', {
                    state: {
                      from: `/transaction-groups/manage/${selectedTransactionGroup.id}`,
                      prefillTransactionGroupId: selectedTransactionGroup.id,
                    },
                  })
                }
              >
                Record for myself
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate(`/transaction-groups/manage/${selectedTransactionGroup.id}/unconfirmed/new`)}
              >
                Record for a member
              </Button>
            </Row>
          </FirstDivision>
        }
        firstZoneStyling={{ scroll: true, grow: false }}
        second={
          <SecondDivision>
            <TransactionList
              items={groupTransactions}
              ItemComponent={GroupTransactionCard}
              additionalItemsProps={{}}
              onClick={openTransaction}
            />
          </SecondDivision>
        }
        secondZoneStyling={{ scroll: true, grow: true }}
      />
    </ContentWithHeader>
  )
}

export default ManageTransactionGroup
