import { Chip, IconButton, Typography } from '@mui/material'
import React, { FC, useCallback, useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { default as styled } from 'styled-components'

import { IconToolsContext } from '../components/icons/IconTools'
import PersonPicker from '../components/inputs/PersonPicker'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column, Row } from '../components/shared/Layout'
import SplitView from '../components/shared/SplitView'
import { useElementDimensions } from '../components/shared/useDimensions'
import GroupTransactionCard from '../components/transactions/GroupTransactionCard'
import { TransactionList } from '../components/transactions/TransactionList'
import { formatFull } from '../domain/model/currency'
import { Email, Person } from '../domain/model/transactionGroup'
import MixedAugmentation from '../service/MixedAugmentation'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

export const FirstDivision = styled.div`
  width: 100%;
  max-width: 100vh;
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  margin: 0 auto;
  padding: 2rem;
  flex-grow: 1;
`

export const SecondDivision = styled(Column)<{ $splitView?: boolean }>`
  padding: 1rem 2rem;
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(128,128,128,0.2)')};
  height: ${(props) => (props.$splitView ? '100%' : 'auto')};
  gap: 2rem;
  align-self: stretch;
`

export const Table = styled.table`
  border-spacing: 0;

  & > thead tr th {
    border-bottom: 3px solid rgba(128, 128, 128, 0.5);
  }

  & > * > * > * {
    padding: 0.5rem 2rem;
  }

  & > tbody > * > :last-child {
    text-align: end;
    font-family: monospace;
  }

  & > tbody > :last-child > * {
    border-top: 1px solid rgba(128, 128, 128, 0.5);
  }
`

type Params = {
  transactionGroupId: string
}

const ManageTransactionGroup: FC = () => {
  const { transactionGroupId } = useParams<Params>()

  const { IconLib } = useContext(IconToolsContext)
  const { update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)
  const { augmentedTransactions: transactions, augmentedTransactionGroups: transactionGroups } =
    useContext(MixedAugmentation)

  const selectedTransactionGroup = useMemo(
    () => transactionGroups.find((t) => t.id === parseInt(transactionGroupId!)),
    [transactionGroups, transactionGroupId],
  )

  const groupTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.transactionGroupData?.transactionGroupId === selectedTransactionGroup?.id && t.getType() === 'expense',
      ),
    [selectedTransactionGroup?.id, transactions],
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

  const usersPayed = useMemo(() => {
    const values = new Map<Email, number>()
    if (typeof selectedTransactionGroup === 'undefined') return values

    selectedTransactionGroup.members.forEach((m) => values.set(m.email, 0))

    for (const transaction of groupTransactions) {
      values.set(transaction.owner, (values.get(transaction.owner) ?? 0) + transaction.amount)
    }

    return values
  }, [selectedTransactionGroup?.members, groupTransactions])

  const totalPayed = useMemo(() => usersPayed.values().reduce((a, b) => a + b, 0), [usersPayed])

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
            <Table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Payed</th>
                </tr>
              </thead>
              <tbody>
                {usersPayed.entries().map(([email, amount]) => (
                  <tr key={`table-user-${email}`}>
                    <td>{selectedTransactionGroup.members.find((m) => m.email === email)?.name ?? email}</td>
                    <td>{formatFull(selectedTransactionGroup.augmentedCurrency!, amount)}</td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td>{formatFull(selectedTransactionGroup.augmentedCurrency!, totalPayed)}</td>
                </tr>
              </tbody>
            </Table>
          </FirstDivision>
        }
        firstZoneStyling={{ scroll: true, grow: false }}
        second={
          <SecondDivision>
            <TransactionList
              items={groupTransactions}
              ItemComponent={GroupTransactionCard}
              additionalItemsProps={{}}
              onClick={console.log}
            />
          </SecondDivision>
        }
        secondZoneStyling={{ scroll: true, grow: true }}
      />
    </ContentWithHeader>
  )
}

export default ManageTransactionGroup
