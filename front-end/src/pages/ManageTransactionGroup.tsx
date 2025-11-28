import { Chip, IconButton, Typography } from '@mui/material'
import React, { FC, useCallback, useContext, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { UserContext } from '../App'
import { IconToolsContext } from '../components/icons/IconTools'
import PersonPicker from '../components/inputs/PersonPicker'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Row } from '../components/shared/Layout'
import { Email, Person } from '../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../service/ServiceContext'

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

type Params = {
  transactionGroupId: string
}

const ManageTransactionGroup: FC = () => {
  const { transactionGroupId } = useParams<Params>()

  const { email: myEmail } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)
  const { state: transactionGroups, update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)

  const selectedTransactionGroup = useMemo(
    () => transactionGroups.find((t) => t.id === parseInt(transactionGroupId!)),
    [transactionGroups, transactionGroupId],
  )

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
        {
          members: [...currentMembers, new Person(email, name, null, false)],
        },
      )
    },
    [selectedTransactionGroup, updateTransactionGroup],
  )

  const removeUserFromGroup = useCallback(
    (email: string) => {
      if (typeof selectedTransactionGroup === 'undefined') return

      updateTransactionGroup(
        { id: selectedTransactionGroup!.id },
        {
          members: selectedTransactionGroup.members.filter((m) => m.email !== email),
        },
      )
    },
    [selectedTransactionGroup, updateTransactionGroup],
  )

  if (!selectedTransactionGroup) {
    return <LoadingScreen />
  }

  return (
    <ContentWithHeader title={`Manage transaction group`} action="menu" withPadding withScrolling>
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
    </ContentWithHeader>
  )
}

export default ManageTransactionGroup
