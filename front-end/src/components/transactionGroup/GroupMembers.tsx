import { Chip, IconButton, Stack } from '@mui/material'
import { CSSProperties, FC, useCallback, useContext } from 'react'

import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { OnlineContext } from '../../service/OnlineContext'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import PersonPicker from '../inputs/PersonPicker'

const GroupMembers: FC<{ transactionGroup: TransactionGroup; style?: CSSProperties }> = ({
  transactionGroup,
  style,
}) => {
  const { IconLib } = useContext(IconToolsContext)
  const online = useContext(OnlineContext)
  const { update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)

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
          <IconButton aria-label="add someone to transaction group" onClick={onClick} disabled={!online}>
            <IconLib.BsPlusCircle />
          </IconButton>
        )}
        allowNew
        excludeEmails={transactionGroup.members.map((m) => m.email)}
        value={null}
        labelText={''}
      />
      {transactionGroup.members.map((member) => (
        <Chip
          key={member.email}
          label={member.name}
          variant={member.joined ? 'filled' : 'outlined'}
          onDelete={member.joined || !online ? undefined : () => removeMember(member.email)}
        />
      ))}
    </Stack>
  )
}

export default GroupMembers
