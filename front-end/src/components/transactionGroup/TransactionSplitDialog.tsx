import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import SplitValuesEditor, { splitValuesError, SplitValueKind } from './SplitValuesEditor'
import { formatFull } from '../../domain/model/currency'
import {
  AugmentedTransaction,
  AugmentedTransactionGroupData,
  MemberValue,
  SplitOverride,
  SplitType,
  TransactionGroupData,
  transactionGroupSplitTypeToInternal,
} from '../../domain/model/transaction'
import { MemberSplitValues, SplitTypeToString } from '../../domain/model/transactionGroup'
import { UnconfirmedAugmentedTransaction } from '../../domain/model/unconfirmedTransaction'
import {
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import SelectOne from '../inputs/SelectOne'
import { DrawerContext } from '../Menu'

type Choice = 'default' | SplitType

const choices: { choice: Choice; label: string; kind: SplitValueKind | null }[] = [
  { choice: 'default', label: 'Group default', kind: null },
  { choice: SplitType.EQUAL, label: 'Equal', kind: 'participants' },
  { choice: SplitType.PERCENTAGE, label: 'Percentage', kind: 'percentage' },
  { choice: SplitType.SHARES, label: 'Shares', kind: 'shares' },
  { choice: SplitType.EXACT_AMOUNT, label: 'Exact amounts', kind: 'amount' },
]

const TransactionSplitDialog: FC<{ transaction: AugmentedTransaction; onClose(): void }> = ({
  transaction,
  onClose,
}) => {
  const { privacyMode } = useContext(DrawerContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { setTransactionSplit } = useContext(TransactionGroupServiceContext)
  const { update: updateUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)

  const groupData = transaction.augmentedTransactionGroupData!
  const group = groupData.transactionGroup
  const current = groupData.splitOverride

  const initialValues = (choice: Choice): MemberSplitValues => {
    if (current && current.splitTypeOverride === choice) {
      return new Map(current.memberValues.map((m) => [m.email, m.value]))
    }
    if (choice === SplitType.EQUAL) return new Map(group.members.map((m) => [m.email, null]))
    if (choice !== 'default' && choice === transactionGroupSplitTypeToInternal(group.splitType)) {
      return new Map(group.members.map((m) => [m.email, m.splitValue]))
    }
    return new Map(group.members.map((m) => [m.email, null]))
  }

  const [choice, setChoice] = useState<Choice>(current ? current.splitTypeOverride : 'default')
  const [values, setValues] = useState<MemberSplitValues>(() => initialValues(choice))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const kind = choices.find((c) => c.choice === choice)!.kind
  const valuesError = kind ? splitValuesError(kind, values, transaction.amount) : null

  const override = useMemo(() => {
    if (choice === 'default') return null
    const memberValues =
      kind === 'participants'
        ? [...values.keys()].map((email) => new MemberValue(email, null))
        : group.members.map((m) => new MemberValue(m.email, values.get(m.email) ?? null))
    return new SplitOverride(choice, memberValues)
  }, [choice, kind, values, group.members])

  const shares = useMemo(() => {
    const preview = new AugmentedTransaction(
      transaction,
      transaction.augmentedFinancialIncomeData,
      new AugmentedTransactionGroupData(new TransactionGroupData(group.id, override), group),
      transaction.currency,
      transaction.receiverCurrency,
    )
    return group.members.map((m) => ({
      name: m.name,
      share: (m.email === transaction.owner ? transaction.amount : 0) - preview.getUserContribution(m.email),
    }))
  }, [transaction, group, override])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      if (transaction instanceof UnconfirmedAugmentedTransaction) {
        await updateUnconfirmed({ id: transaction.unconfirmed.id }, { splitOverride: override })
      } else {
        await setTransactionSplit(transaction.id, override)
        await refreshTransactions()
      }
      onClose()
    } catch {
      setError('Could not save the split. Please try again.')
      setSaving(false)
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Split of this transaction</DialogTitle>
      <DialogContent>
        <Stack sx={{ gap: 3, pt: 1 }}>
          <SelectOne
            label="Split"
            value={String(choice)}
            onChange={(value) => {
              const next: Choice = value === 'default' ? 'default' : (Number(value) as SplitType)
              setChoice(next)
              setValues(initialValues(next))
            }}
            options={choices.map((c) => ({
              value: String(c.choice),
              label: c.choice === 'default' ? `Group default (${SplitTypeToString(group.splitType)})` : c.label,
            }))}
            type="dropdown"
          />
          {kind && (
            <SplitValuesEditor
              kind={kind}
              members={group.members}
              values={values}
              onChange={setValues}
              currency={transaction.currency}
              amount={transaction.amount}
            />
          )}
          {!valuesError && (
            <Stack sx={{ gap: 0.5 }}>
              <Typography variant="subtitle2">Each member's part</Typography>
              {shares.map(({ name, share }) => (
                <Stack direction="row" key={name} sx={{ justifyContent: 'space-between' }}>
                  <Typography variant="body1">{name}</Typography>
                  <Typography fontFamily="monospace">{formatFull(transaction.currency, share, privacyMode)}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving || valuesError !== null}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TransactionSplitDialog
