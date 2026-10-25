import { Chip, IconButton, Stack } from '@mui/material'
import { CSSProperties, FC, useCallback, useContext } from 'react'

import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { ReadOnlyContext } from '../../service/ReadOnlyContext'
import { SettlementServiceContext, TransactionGroupServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import PersonPicker from '../inputs/PersonPicker'
import PersonAvatar from '../shared/PersonAvatar'

const GroupMembers: FC<{ transactionGroup: TransactionGroup; style?: CSSProperties }> = ({
  transactionGroup,
  style,
}) => {
  const { IconLib } = useContext(IconToolsContext)
  const readOnly = useContext(ReadOnlyContext) !== null
  const { update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)
  const { state: settlements } = useContext(SettlementServiceContext)
  const hasSettlements = (email: Email) =>
    settlements.some((s) => s.transactionGroupId === transactionGroup.id && s.isEnd(email))

  const addMember = useCallback(
    ({ existing, id, name }: { existing: boolean; id: Email | null; name: string }) => {
      const email = existing ? id! : name
      if (transactionGroup.members.some((m) => m.email === email)) return

      updateTransactionGroup(
        { id: transactionGroup.id },
        { members: [...transactionGroup.members, new Person(email, name, null, false)] },
      )
    },
    [transactionGroup, updateTransactionGroup],
  )

  const removeMember = useCallback(
    (email: string) =>
      updateTransactionGroup(
        { id: transactionGroup.id },
        { members: transactionGroup.members.filter((m) => m.email !== email) },
      ),
    [transactionGroup, updateTransactionGroup],
  )

  return (
    <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, ...style }}>
      <PersonPicker
        onPersonSelected={addMember}
        OverrideTextLabel={({ onClick }) => (
          <IconButton aria-label="add someone to transaction group" onClick={onClick} disabled={readOnly}>
            <IconLib.BsPlusCircle />
          </IconButton>
        )}
        allowNew
        excludeEmails={transactionGroup.members.map((m) => m.email)}
        value={null}
        labelText={''}
        dialogTitle="Add someone to the group"
      />
      {transactionGroup.members.map((member) => (
        <Chip
          key={member.email}
          avatar={<PersonAvatar email={member.email} displayName={member.name} small />}
          label={member.name}
          variant={member.joined ? 'filled' : 'outlined'}
          onDelete={
            member.joined || readOnly || hasSettlements(member.email) ? undefined : () => removeMember(member.email)
          }
        />
      ))}
    </Stack>
  )
}

export default GroupMembers
