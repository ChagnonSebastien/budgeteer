import { Button, IconButton, List, ListItem, ListItemText, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, useContext } from 'react'

import Account, { AccountID } from '../../domain/model/account'
import { OnlineContext } from '../../service/OnlineContext'
import { ImportRecord } from '../../store/remote/ImportRemoteStore'
import { IconToolsContext } from '../icons/IconTools'

interface Props {
  accounts: Account[]
  accountId: AccountID | null
  onAccountChange(id: AccountID): void
  hasProfile: boolean
  onFile(file: File): void
  imports: ImportRecord[]
  onUndo(record: ImportRecord): void
}

const ImportSourceStep: FC<Props> = ({ accounts, accountId, onAccountChange, hasProfile, onFile, imports, onUndo }) => {
  const { IconLib } = useContext(IconToolsContext)
  const online = useContext(OnlineContext)
  const accountImports = imports.filter((record) => record.accountId === accountId)

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <TextField
        select
        variant="standard"
        label="Account"
        value={accountId ?? ''}
        onChange={(ev) => onAccountChange(Number(ev.target.value))}
        helperText="One file maps to one account, the way banks export it"
      >
        {accounts.map((account) => (
          <MenuItem key={account.id} value={account.id}>
            {account.name}
          </MenuItem>
        ))}
      </TextField>

      <Button
        variant="contained"
        component="label"
        disabled={accountId === null || !online}
        startIcon={<IconLib.FaFileImport />}
      >
        {online ? 'Choose a CSV file' : 'Unavailable offline'}
        <input
          hidden
          type="file"
          accept=".csv,text/csv"
          onChange={(ev) => {
            const file = ev.target.files?.[0]
            ev.target.value = ''
            if (file) onFile(file)
          }}
        />
      </Button>
      {hasProfile && (
        <Typography variant="body2" color="text.secondary">
          A saved column mapping exists for this account, so the file goes straight to the preview.
        </Typography>
      )}

      {accountImports.length > 0 && (
        <Stack>
          <Typography variant="subtitle2">Recent imports</Typography>
          <List dense>
            {accountImports.map((record) => (
              <ListItem
                key={record.id}
                secondaryAction={
                  <IconButton aria-label="Undo import" disabled={!online} onClick={() => onUndo(record)}>
                    <IconLib.MdUndo />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={record.fileName || 'Untitled file'}
                  secondary={`${record.rowCount} rows, ${formatDate(record.createdAt, 'PPp')}`}
                />
              </ListItem>
            ))}
          </List>
        </Stack>
      )}
    </Stack>
  )
}

export default ImportSourceStep
