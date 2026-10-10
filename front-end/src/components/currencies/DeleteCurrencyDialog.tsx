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

import Currency, { formatFull } from '../../domain/model/currency'
import {
  AccountServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  SettlementServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import AppDialog from '../shared/AppDialog'
import { useToast } from '../shared/ToastProvider'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const DeleteCurrencyDialog: FC<{ currency: Currency; onClose(): void; onDeleted(): void }> = ({
  currency,
  onClose,
  onDeleted,
}) => {
  const {
    state: currencies,
    tentativeDefaultCurrency,
    deleteCurrency,
    refresh: refreshCurrencies,
  } = useContext(CurrencyServiceContext)
  const { state: accounts, refresh: refreshAccounts } = useContext(AccountServiceContext)
  const { state: transactions, refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)
  const { state: settlements, refresh: refreshSettlements } = useContext(SettlementServiceContext)
  const { state: transactionGroups, refresh: refreshGroups } = useContext(TransactionGroupServiceContext)
  const { refresh: refreshRates } = useContext(ExchangeRateServiceContext)
  const { showToast } = useToast()

  const [mode, setMode] = useState<'migrate' | 'delete'>('migrate')
  const [target, setTarget] = useState<Currency | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isDefault = tentativeDefaultCurrency?.id === currency.id
  const candidates = useMemo(
    () => currencies.filter((c) => c.id !== currency.id && c.decimalPoints === currency.decimalPoints),
    [currencies, currency],
  )
  const groupsUsingIt = transactionGroups.filter((g) => g.currency === currency.id).map((g) => g.name)

  const balances = accounts.flatMap((account) =>
    account.initialAmounts
      .filter((balance) => balance.currencyId === currency.id && balance.value !== 0)
      .map((balance) => `${account.name} (${formatFull(currency, balance.value)})`),
  )

  const affected = useMemo(
    () => transactions.filter((t) => t.currencyId === currency.id || t.receiverCurrencyId === currency.id),
    [transactions, currency],
  )
  const affectedIds = new Set(affected.map((t) => t.id))
  const grouped = affected.filter((t) => t.transactionGroupData !== null)
  const groupIds = new Set(grouped.map((t) => t.transactionGroupData!.transactionGroupId))
  const groupedNames = transactionGroups.filter((g) => groupIds.has(g.id)).map((g) => g.name)
  const settlementSides = settlements.filter(
    (s) => s.ownTransactionId !== null && affectedIds.has(s.ownTransactionId),
  ).length
  const linkedIncomes = transactions.filter((t) => t.financialIncomeData?.relatedCurrencyId === currency.id)
  const unlinkedIncomes = linkedIncomes.filter((t) => !affectedIds.has(t.id)).length
  const collapsedConversions =
    target === null
      ? 0
      : affected.filter(
          (t) =>
            t.currencyId !== t.receiverCurrencyId &&
            [t.currencyId, t.receiverCurrencyId].includes(target.id) &&
            [t.currencyId, t.receiverCurrencyId].includes(currency.id),
        ).length

  const blocked = isDefault || (mode === 'migrate' ? target === null : groupsUsingIt.length > 0)

  const confirm = async () => {
    setDeleting(true)
    try {
      const result = await deleteCurrency(currency.id, mode === 'migrate' ? target!.id : undefined)
      await Promise.all([
        refreshCurrencies(),
        refreshAccounts(),
        refreshTransactions(),
        refreshUnconfirmed(),
        refreshSettlements(),
        refreshGroups(),
        refreshRates(),
      ])
      const parts = [
        mode === 'migrate'
          ? `${plural(result.migratedTransactions, 'transaction')} moved`
          : `${plural(result.deletedTransactions, 'transaction')} deleted`,
        result.movedToUnconfirmed > 0 ? `${result.movedToUnconfirmed} moved to unconfirmed` : null,
        result.deletedBalances > 0 ? `${plural(result.deletedBalances, 'starting balance')} deleted` : null,
      ].filter((part) => part !== null)
      showToast(`${currency.name} deleted, ${parts.join(', ')}`)
      onDeleted()
    } catch (err) {
      console.error(err)
      showToast(`Could not delete ${currency.name}`, 'error')
      setDeleting(false)
    }
  }

  const summary: string[] = []
  if (balances.length > 0) {
    summary.push(`Starting balances in ${currency.symbol} will be deleted: ${balances.join(', ')}.`)
  }
  if (mode === 'migrate' && target) {
    if (affected.length > 0) summary.push(`${plural(affected.length, 'transaction')} will use ${target.name} instead.`)
    if (collapsedConversions > 0) {
      summary.push(
        `${plural(collapsedConversions, 'conversion')} between ${currency.symbol} and ${target.symbol} will have both sides in ${target.symbol}, keeping their two amounts.`,
      )
    }
    if (linkedIncomes.length > 0) {
      summary.push(
        `${plural(linkedIncomes.length, 'financial income')} tied to ${currency.name} will be tied to ${target.name}.`,
      )
    }
  }
  if (mode === 'delete') {
    if (affected.length > 0)
      summary.push(`${plural(affected.length, 'transaction')} in ${currency.symbol} will be deleted.`)
    if (grouped.length > 0) {
      summary.push(
        `${plural(grouped.length, 'transaction')} in ${groupedNames.join(', ')} will become unconfirmed instead, so the other members keep seeing them. You can confirm them again from the group page.`,
      )
    }
    if (settlementSides > 0) {
      summary.push(
        `${plural(settlementSides, 'transaction')} ${settlementSides === 1 ? 'is your side' : 'are your sides'} of settlements. The settlements stay, and you can restore your side from the group page.`,
      )
    }
    if (unlinkedIncomes > 0) {
      summary.push(
        `${plural(unlinkedIncomes, 'financial income')} tied to ${currency.name} will become regular income.`,
      )
    }
  }
  summary.push(`Its exchange rate history and ${currency.name} itself will be deleted. This cannot be undone.`)

  return (
    <AppDialog
      open
      onClose={onClose}
      title={`Delete ${currency.name}`}
      actions={
        <>
          <Button color="inherit" onClick={onClose}>
            {isDefault ? 'Close' : 'Cancel'}
          </Button>
          {!isDefault && (
            <Button variant="contained" color="error" disabled={blocked || deleting} onClick={confirm}>
              Delete currency
            </Button>
          )}
        </>
      }
    >
      {isDefault ? (
        <Alert severity="info">{currency.name} is your main currency, so it cannot be deleted.</Alert>
      ) : (
        <Stack spacing={2}>
          <Typography>
            {affected.length === 0
              ? `No transaction uses ${currency.symbol}.`
              : `${plural(affected.length, 'transaction')} use ${currency.symbol}. What should happen to them?`}
          </Typography>

          <RadioGroup value={mode} onChange={(_, value) => setMode(value as 'migrate' | 'delete')}>
            <FormControlLabel
              value="migrate"
              control={<Radio />}
              label="Move them to another currency"
              disabled={candidates.length === 0}
            />
            <FormControlLabel
              value="delete"
              control={<Radio />}
              label="Delete them"
              disabled={groupsUsingIt.length > 0}
            />
          </RadioGroup>

          {groupsUsingIt.length > 0 && (
            <Alert severity="info">
              {groupsUsingIt.join(', ')} {groupsUsingIt.length === 1 ? 'uses' : 'use'} {currency.symbol} as your group
              currency, so its transactions have to move to another currency.
            </Alert>
          )}

          {mode === 'migrate' &&
            (candidates.length === 0 ? (
              <Alert severity="warning">
                No other currency has {plural(currency.decimalPoints, 'decimal place')}, so its transactions cannot be
                moved. Delete them instead, or add such a currency first.
              </Alert>
            ) : (
              <Autocomplete
                options={candidates}
                value={target}
                onChange={(_, value) => setTarget(value)}
                getOptionLabel={(option) => `${option.name} (${option.symbol})`}
                isOptionEqualToValue={(a, b) => a.id === b.id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Replacement currency"
                    helperText={`Only currencies with ${plural(currency.decimalPoints, 'decimal place')} are listed`}
                  />
                )}
              />
            ))}

          {!blocked && (
            <Alert severity={mode === 'delete' || balances.length > 0 ? 'warning' : 'info'}>
              <Stack spacing={0.5}>
                {summary.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </Stack>
            </Alert>
          )}
        </Stack>
      )}
    </AppDialog>
  )
}

export default DeleteCurrencyDialog
