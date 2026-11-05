import {
  Autocomplete,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { formatDate } from 'date-fns'
import { FC, useContext } from 'react'

import Account, { AccountID } from '../../domain/model/account'
import { ReadOnlyContext } from '../../service/ReadOnlyContext'
import { ImportRecord } from '../../store/remote/ImportRemoteStore'
import { IconToolsContext } from '../icons/IconTools'

interface Props {
  accounts: Account[]
  accountIds: AccountID[]
  onAccountsChange(ids: AccountID[]): void
  hasProfile: boolean
  onFile(file: File): void
  imports: ImportRecord[]
  onUndo(record: ImportRecord): void
}

const ImportSourceStep: FC<Props> = ({
  accounts,
  accountIds,
  onAccountsChange,
  hasProfile,
  onFile,
  imports,
  onUndo,
}) => {
  const { IconLib } = useContext(IconToolsContext)
  const readOnly = useContext(ReadOnlyContext)
  const accountImports = imports.filter((record) => accountIds.includes(record.accountId))
  const selected = accounts.filter((account) => accountIds.includes(account.id))

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <Autocomplete
        multiple
        disableCloseOnSelect
        options={accounts}
        value={selected}
        onChange={(_, value) => onAccountsChange(value.map((account) => account.id))}
        getOptionLabel={(account) => account.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        renderInput={(params) => (
          <TextField
            {...params}
            variant="standard"
            label="Accounts"
            helperText="Pick every account the file holds; with several, a column of the file tells them apart"
          />
        )}
      />

      <Button
        variant="contained"
        component="label"
        disabled={accountIds.length === 0 || readOnly !== null}
        startIcon={<IconLib.FaFileImport />}
      >
        {readOnly?.label ?? 'Choose a CSV file'}
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
          A saved column mapping exists for {accountIds.length > 1 ? 'these accounts' : 'this account'}, so the file
          goes straight to the preview.
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
                  <IconButton aria-label="Undo import" disabled={readOnly !== null} onClick={() => onUndo(record)}>
                    <IconLib.MdUndo />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${record.fileName || 'Untitled file'}${accountIds.length > 1 ? ` (${accounts.find((a) => a.id === record.accountId)?.name ?? ''})` : ''}`}
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
