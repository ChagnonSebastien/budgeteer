import { Chip, IconButton } from '@mui/material'
import { CSSProperties, FC, useCallback, useContext } from 'react'

import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import PersonPicker from '../inputs/PersonPicker'
import { Row } from '../shared/Layout'

const emailRegex =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/

const GroupMembers: FC<{ transactionGroup: TransactionGroup; style?: CSSProperties }> = ({
  transactionGroup,
  style,
}) => {
  const { IconLib } = useContext(IconToolsContext)
  const { update: updateTransactionGroup } = useContext(TransactionGroupServiceContext)

  const addMember = useCallback(
    ({ existing, id, name }: { existing: boolean; id: Email | null; name: string }) => {
      const email = existing ? id! : name
      if (transactionGroup.members.some((m) => m.email === email)) {
        throw new Error(`${email} already is a member of this transaction group`)
      }

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
    <Row style={{ alignItems: 'center', flexWrap: 'wrap', gap: '.5rem', ...style }}>
      <PersonPicker
        onPersonSelected={addMember}
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
      {transactionGroup.members.map((member) => (
        <Chip
          key={member.email}
          label={member.name}
          variant={member.joined ? 'filled' : 'outlined'}
          onDelete={member.joined ? undefined : () => removeMember(member.email)}
        />
      ))}
    </Row>
  )
}

export default GroupMembers
