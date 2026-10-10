import {
  Alert,
  Autocomplete,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import Account from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import { OnlineContext } from '../../service/OnlineContext'
import {
  AccountServiceContext,
  CurrencyServiceContext,
  SettlementServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import { searchFilterOptions } from '../../utils'
import { DrawerContext } from '../Menu'
import AppDialog from '../shared/AppDialog'
import { useToast } from '../shared/ToastProvider'

type Mode = 'replace' | 'drop' | 'delete'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const DeleteAccountDialog: FC<{ account: Account; onClose(): void; onDeleted(): void }> = ({
  account,
  onClose,
  onDeleted,
}) => {
  const { hidden_default_account } = useContext(UserContext)
  const online = useContext(OnlineContext)
  const { state: accounts, deleteAccount, refresh: refreshAccounts } = useContext(AccountServiceContext)
  const { state: transactions, refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)
  const { state: settlements, refresh: refreshSettlements } = useContext(SettlementServiceContext)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { showToast } = useToast()
  const { privacyMode } = useContext(DrawerContext)

  const [mode, setMode] = useState<Mode>('replace')
  const [replacement, setReplacement] = useState<Account | null>(null)
  const [deleting, setDeleting] = useState(false)

  const candidates = useMemo(
    () => accounts.filter((a) => a.id !== account.id && a.id !== hidden_default_account && a.isMine === account.isMine),
    [accounts, account, hidden_default_account],
  )

  const affected = useMemo(
    () => transactions.filter((t) => t.senderId === account.id || t.receiverId === account.id),
    [transactions, account],
  )

  const grouped = useMemo(() => affected.filter((t) => t.transactionGroupData !== null), [affected])
  const groupNames = useMemo(() => {
    const ids = new Set(grouped.map((t) => t.transactionGroupData!.transactionGroupId))
    return transactionGroups.filter((g) => ids.has(g.id)).map((g) => g.name)
  }, [grouped, transactionGroups])

  const settlementSides = useMemo(() => {
    const ids = new Set(affected.map((t) => t.id))
    return settlements.filter((s) => s.ownTransactionId !== null && ids.has(s.ownTransactionId)).length
  }, [affected, settlements])

  const selfTransfers = useMemo(
    () =>
      replacement === null
        ? 0
        : affected.filter((t) => t.senderId === replacement.id || t.receiverId === replacement.id).length,
    [affected, replacement],
  )

  const startingBalances = account.initialAmounts
    .filter((balance) => balance.value !== 0)
    .map((balance) => {
      const currency = currencies.find((c) => c.id === balance.currencyId)
      return currency ? formatFull(currency, balance.value, privacyMode) : null
    })
    .filter((text) => text !== null)
    .join(', ')

  const blocked = mode === 'replace' && (replacement === null || selfTransfers > 0)

  const confirm = async () => {
    setDeleting(true)
    try {
      const result = await deleteAccount(account.id, {
        replacementId: mode === 'replace' ? replacement!.id : undefined,
        deleteTransactions: mode === 'delete',
      })
      await Promise.all([refreshAccounts(), refreshTransactions(), refreshUnconfirmed(), refreshSettlements()])
      const verb = mode === 'delete' ? 'deleted' : 'updated'
      const moved = result.movedToUnconfirmed > 0 ? `, ${result.movedToUnconfirmed} moved to unconfirmed` : ''
      showToast(`${account.name} deleted, ${plural(result.affected, 'transaction')} ${verb}${moved}`)
      onDeleted()
    } catch (err) {
      console.error(err)
      showToast(`Could not delete ${account.name}`, 'error')
      setDeleting(false)
    }
  }

  const summary: string[] = []
  if (affected.length > 0) {
    if (mode === 'replace' && replacement) {
      summary.push(`${plural(affected.length, 'transaction')} will use ${replacement.name} instead.`)
    } else if (mode === 'drop') {
      summary.push(
        `${plural(affected.length, 'transaction')} will no longer have this account; their other side stays.`,
      )
    } else if (mode === 'delete') {
      summary.push(`${plural(affected.length, 'transaction')} will be deleted.`)
      if (grouped.length > 0) {
        summary.push(
          `${plural(grouped.length, 'transaction')} in ${groupNames.join(', ')} will become unconfirmed instead, so the other members keep seeing them. You can confirm them again with another account from the group page.`,
        )
      }
      if (settlementSides > 0) {
        summary.push(
          `${plural(settlementSides, 'transaction')} ${settlementSides === 1 ? 'is your side' : 'are your sides'} of settlements. The settlements stay, and you can restore your side from the group page.`,
        )
      }
    }
  }
  if (startingBalances !== '') {
    summary.push(
      mode === 'replace' && replacement
        ? `Its starting balance (${startingBalances}) will be added to ${replacement.name}.`
        : `Its starting balance (${startingBalances}) will be deleted.`,
    )
  }
  summary.push(`${account.name} will be deleted. This cannot be undone.`)

  return (
    <AppDialog
      open
      onClose={onClose}
      title={`Delete ${account.name}`}
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" color="error" disabled={blocked || deleting || !online} onClick={confirm}>
            Delete account
          </Button>
        </>
      }
    >
      <Stack spacing={2}>
        <Typography>
          {affected.length === 0
            ? 'No transaction uses this account.'
            : `${plural(affected.length, 'transaction')} use this account. What should happen to them?`}
        </Typography>

        <RadioGroup value={mode} onChange={(_, value) => setMode(value as Mode)}>
          <FormControlLabel
            value="replace"
            control={<Radio />}
            label={account.isMine ? 'Move them to another of your accounts' : 'Move them to another account'}
            disabled={candidates.length === 0}
          />
          {!account.isMine && (
            <FormControlLabel value="drop" control={<Radio />} label="Remove this account from them" />
          )}
          <FormControlLabel value="delete" control={<Radio />} label="Delete them" />
        </RadioGroup>

        {mode === 'replace' &&
          (candidates.length === 0 ? (
            <Alert severity="warning">
              {account.isMine
                ? 'This is your only account, so there is nowhere to move its transactions. Delete them instead, or add another account first.'
                : 'There is no other account to move its transactions to.'}
            </Alert>
          ) : (
            <Autocomplete
              filterOptions={searchFilterOptions}
              options={candidates}
              value={replacement}
              onChange={(_, value) => setReplacement(value)}
              getOptionLabel={(option) =>
                option.financialInstitution ? `${option.name} (${option.financialInstitution})` : option.name
              }
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="Replacement account" />}
            />
          ))}

        {mode === 'replace' && replacement !== null && selfTransfers > 0 && (
          <Alert severity="error">
            {plural(selfTransfers, 'transaction')} already go between {account.name} and {replacement.name}. They would
            become transfers to the same account, so pick a different account.
          </Alert>
        )}

        {!blocked && (
          <Alert severity={mode === 'delete' && affected.length > 0 ? 'warning' : 'info'}>
            <Stack spacing={0.5}>
              {summary.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </Stack>
          </Alert>
        )}
      </Stack>
    </AppDialog>
  )
}

export default DeleteAccountDialog
