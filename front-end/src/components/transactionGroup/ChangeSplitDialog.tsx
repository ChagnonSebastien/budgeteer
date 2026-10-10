import { Alert, Button, Stack, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { GroupPaidTable } from './GroupLedger'
import SplitValuesEditor, { splitValuesError, SplitValueKind } from './SplitValuesEditor'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import {
  AugmentedTransaction,
  AugmentedTransactionGroupData,
  MemberValue,
  SplitOverride,
  TransactionGroupData,
  transactionGroupSplitTypeToInternal,
} from '../../domain/model/transaction'
import TransactionGroup, {
  AugmentedTransactionGroup,
  MemberSplitValues,
  ParseSplitType,
  Person,
  SplitChangeScope,
  SplitType,
  SplitTypeToString,
} from '../../domain/model/transactionGroup'
import {
  TransactionGroupServiceContext,
  TransactionServiceContext,
  UnconfirmedTransactionServiceContext,
} from '../../service/ServiceContext'
import SelectOne from '../inputs/SelectOne'
import AppDialog from '../shared/AppDialog'

const valueKind = (splitType: SplitType): SplitValueKind | null => {
  if (splitType === SplitType.PERCENTAGE) return 'percentage'
  if (splitType === SplitType.SHARES) return 'shares'
  return null
}

const scopes = [
  {
    scope: SplitChangeScope.TRANSACTIONS_WITHOUT_CUSTOM_SPLIT,
    label: 'Past transactions without a custom split',
    description: 'Transactions with a custom split keep it.',
  },
  {
    scope: SplitChangeScope.ALL_TRANSACTIONS,
    label: 'All past transactions',
    description: 'Every custom split is removed.',
  },
  {
    scope: SplitChangeScope.FUTURE_TRANSACTIONS,
    label: 'New transactions only',
    description: 'Past transactions keep the split they have today.',
  },
]

const simulate = (
  transactions: AugmentedTransaction[],
  group: AugmentedTransactionGroup,
  splitType: SplitType,
  values: MemberSplitValues,
  scope: SplitChangeScope,
): AugmentedTransaction[] => {
  const nextGroup = new AugmentedTransactionGroup(
    new TransactionGroup(
      group.id,
      group.name,
      group.originalCurrency,
      splitType,
      group.members.map((m) => new Person(m.email, m.name, values.get(m.email) ?? m.splitValue, m.joined)),
      group.currency,
      group.category,
      group.hidden,
      group.originalCurrencySymbol,
      group.originalCurrencyDecimalPoints,
      group.createdAt,
    ),
    group.augmentedCurrency,
    group.augmentedCategory,
  )
  const pinned = new SplitOverride(
    transactionGroupSplitTypeToInternal(group.splitType),
    group.members.map((m) => new MemberValue(m.email, m.splitValue)),
  )

  return transactions.map((t) => {
    if (t instanceof SettlementAugmentedTransaction) return t
    const current = t.augmentedTransactionGroupData?.splitOverride ?? null
    const override =
      scope === SplitChangeScope.ALL_TRANSACTIONS
        ? null
        : scope === SplitChangeScope.FUTURE_TRANSACTIONS
          ? (current ?? pinned)
          : current
    const groupData = new TransactionGroupData(group.id, override)
    return new AugmentedTransaction(
      t,
      t.augmentedFinancialIncomeData,
      new AugmentedTransactionGroupData(groupData, nextGroup),
      t.currency,
      t.receiverCurrency,
      t.category,
      t.sender,
      t.receiver,
    )
  })
}

const ChangeSplitDialog: FC<{
  open: boolean
  onClose(): void
  transactionGroup: AugmentedTransactionGroup
  transactions: AugmentedTransaction[]
}> = ({ open, onClose, transactionGroup, transactions }) => {
  const { changeSplit, refresh: refreshGroups } = useContext(TransactionGroupServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { refresh: refreshUnconfirmed } = useContext(UnconfirmedTransactionServiceContext)

  const [step, setStep] = useState<'split' | 'scope'>('split')
  const [splitType, setSplitType] = useState(transactionGroup.splitType)
  const [values, setValues] = useState<MemberSplitValues>(
    () => new Map(transactionGroup.members.map((m) => [m.email, m.splitValue])),
  )
  const [scope, setScope] = useState(SplitChangeScope.TRANSACTIONS_WITHOUT_CUSTOM_SPLIT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const kind = valueKind(splitType)
  const valuesError = kind ? splitValuesError(kind, values) : null

  const preview = useMemo(
    () => simulate(transactions, transactionGroup, splitType, kind ? values : new Map(), scope),
    [transactions, transactionGroup, splitType, kind, values, scope],
  )

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await changeSplit(transactionGroup.id, splitType, kind ? values : new Map(), scope)
      await Promise.all([refreshGroups(), refreshTransactions(), refreshUnconfirmed()])
      onClose()
    } catch {
      setError('Could not change the split. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={() => !saving && onClose()}
      fullWidth
      title={step === 'split' ? 'Change the default split' : 'Apply the new split to'}
      actions={
        step === 'split' ? (
          <>
            <Button color="inherit" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" disabled={valuesError !== null} onClick={() => setStep('scope')}>
              Next
            </Button>
          </>
        ) : (
          <>
            <Button color="inherit" onClick={() => setStep('split')} disabled={saving}>
              Back
            </Button>
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </>
        )
      }
    >
      {step === 'split' ? (
        <Stack sx={{ gap: 3, pt: 1 }}>
          <SelectOne
            label="Split Type"
            value={SplitTypeToString(splitType)}
            onChange={(value) => setSplitType(ParseSplitType(value) ?? SplitType.EQUAL)}
            options={[SplitType.EQUAL, SplitType.PERCENTAGE, SplitType.SHARES].map((st) => ({
              value: SplitTypeToString(st),
              label: SplitTypeToString(st),
            }))}
            type="dropdown"
          />
          {kind && (
            <SplitValuesEditor kind={kind} members={transactionGroup.members} values={values} onChange={setValues} />
          )}
        </Stack>
      ) : (
        <Stack sx={{ gap: 3, pt: 1 }}>
          <SelectOne
            label="Which transactions use the new split?"
            value={String(scope)}
            onChange={(value) => setScope(Number(value) as SplitChangeScope)}
            options={scopes.map((s) => ({ value: String(s.scope), label: s.label }))}
            type="radio"
          />
          <Typography variant="body2" color="textDisabled">
            {scopes.find((s) => s.scope === scope)!.description}
          </Typography>
          <Stack sx={{ alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">Balances after the change</Typography>
            <GroupPaidTable
              members={transactionGroup.members}
              transactions={preview}
              currency={transactionGroup.augmentedCurrency}
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      )}
    </AppDialog>
  )
}

export default ChangeSplitDialog
