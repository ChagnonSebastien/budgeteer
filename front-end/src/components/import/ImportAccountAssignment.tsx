import { MenuItem, Stack, TextField, Typography } from '@mui/material'
import { FC } from 'react'

import Account, { AccountID } from '../../domain/model/account'

export interface AccountAssignment {
  name: string
  rows: number
  accountId: AccountID | null | undefined
}

interface Props {
  assignments: AccountAssignment[]
  accounts: Account[]
  onChange(name: string, accountId: AccountID | null): void
}

const skip = 'skip'

const ImportAccountAssignment: FC<Props> = ({ assignments, accounts, onChange }) => (
  <Stack spacing={1}>
    <Typography variant="subtitle2">Accounts in the file</Typography>
    {assignments.map(({ name, rows, accountId }) => (
      <Stack key={name} direction="row" useFlexGap spacing={2} flexWrap="wrap" alignItems="flex-end">
        <Stack sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}>
          <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
            {name || '(empty)'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rows} rows
          </Typography>
        </Stack>
        <TextField
          select
          variant="standard"
          label="Import into"
          error={accountId === undefined}
          value={accountId === undefined ? '' : accountId === null ? skip : accountId}
          onChange={(ev) => onChange(name, ev.target.value === skip ? null : Number(ev.target.value))}
          sx={{ flex: 1, minWidth: (t) => `min(${t.fieldWidth.sm}, 100%)` }}
        >
          {accounts.map((account) => (
            <MenuItem key={account.id} value={account.id}>
              {account.name}
            </MenuItem>
          ))}
          <MenuItem value={skip}>Skip these rows</MenuItem>
        </TextField>
      </Stack>
    ))}
  </Stack>
)

export default ImportAccountAssignment
