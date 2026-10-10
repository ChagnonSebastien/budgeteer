import { Alert, Button, TextField, Typography } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { UserContext } from '../App'
import DatePicker from '../components/inputs/DatePicker'
import { FixedPointInput } from '../components/inputs/FixedPointInput'
import SelectOne from '../components/inputs/SelectOne'
import LoadingScreen from '../components/LoadingScreen'
import ContentWithHeader from '../components/shared/ContentWithHeader'
import { Column } from '../components/shared/Layout'
import { useToast } from '../components/shared/ToastProvider'
import useAugmentedTransactionGroup from '../components/transactionGroup/useAugmentedTransactionGroup'
import TransactionForm from '../components/transactions/TransactionForm'
import Transaction, { AugmentedTransaction, TransactionUpdatableFields } from '../domain/model/transaction'
import { PromotionFields } from '../domain/model/unconfirmedTransaction'
import MixedAugmentation from '../service/MixedAugmentation'
import { SettlementServiceContext, TransactionServiceContext } from '../service/ServiceContext'

export type SettlementPageMode = 'new' | 'edit' | 'confirm' | 'record'

const titles: Record<SettlementPageMode, string> = {
  new: 'Settle up',
  edit: 'Edit settlement',
  confirm: 'Confirm settlement',
  record: 'Record settlement',
}

type Params = {
  transactionGroupId: string
  settlementId?: string
}

const SettlementPage: FC<{ mode: SettlementPageMode }> = ({ mode }) => {
  const { transactionGroupId, settlementId } = useParams<Params>()
  const navigate = useNavigate()
  const { email, authentification_method } = useContext(UserContext)
  const {
    state: settlements,
    createSettlement,
    updateSettlement,
    confirmSettlement,
    recordSettlementTransaction,
    refresh: refreshSettlements,
  } = useContext(SettlementServiceContext)
  const { refresh: refreshTransactions } = useContext(TransactionServiceContext)
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { showToast } = useToast()

  const groupId = parseInt(transactionGroupId!)
  const transactionGroup = useAugmentedTransactionGroup(groupId)
  const settlement = settlements.find((s) => s.id === Number(settlementId))
  const isGuest = authentification_method === 'guest'
  const groupPage = `/transaction-groups/manage/${groupId}`

  const others = useMemo(
    () => transactionGroup?.members.filter((m) => m.joined && m.email !== email) ?? [],
    [transactionGroup, email],
  )

  const [direction, setDirection] = useState<'paid' | 'received'>(
    settlement && settlement.receiver === email ? 'received' : 'paid',
  )
  const [counterpart, setCounterpart] = useState(
    settlement ? (settlement.payer === email ? settlement.receiver : settlement.payer) : (others[0]?.email ?? ''),
  )
  const [amount, setAmount] = useState(settlement?.amount ?? 0)
  const [date, setDate] = useState(settlement?.date ?? new Date())
  const [note, setNote] = useState(settlement?.note ?? '')
  const [step, setStep] = useState<'details' | 'books'>(mode === 'new' || mode === 'edit' ? 'details' : 'books')
  const [error, setError] = useState('')

  if (!transactionGroup || (mode !== 'new' && !settlement)) {
    return <LoadingScreen />
  }

  const currency = transactionGroup.augmentedCurrency
  const chosenCounterpart = counterpart || (others[0]?.email ?? '')
  const counterpartEmail =
    mode === 'new' ? chosenCounterpart : settlement!.payer === email ? settlement!.receiver : settlement!.payer
  const counterpartName = transactionGroup.members.find((m) => m.email === counterpartEmail)?.name ?? counterpartEmail
  const iPaid = mode === 'new' || mode === 'edit' ? direction === 'paid' : settlement!.payer === email
  const finalAmount = mode === 'new' || mode === 'edit' ? amount : settlement!.amount
  const finalDate = mode === 'new' || mode === 'edit' ? date : settlement!.date

  const save = async (own: PromotionFields | null) => {
    setError('')
    try {
      if (mode === 'new') {
        await createSettlement(
          {
            transactionGroupId: groupId,
            payer: iPaid ? email : chosenCounterpart,
            receiver: iPaid ? chosenCounterpart : email,
            amount,
            date,
            note,
          },
          own,
        )
      } else if (mode === 'edit') {
        await updateSettlement(settlement!.id, { amount, date, note }, own)
      } else if (mode === 'confirm') {
        await confirmSettlement(settlement!.id, own)
      } else {
        await recordSettlementTransaction(settlement!.id, own!)
      }
      await Promise.all([refreshSettlements(), refreshTransactions()])
      showToast(mode === 'confirm' ? 'Settlement confirmed' : 'Settlement saved')
      navigate(groupPage, { replace: true })
    } catch {
      setError('Could not save the settlement. Please try again.')
    }
  }

  // Reuse what was recorded for an earlier proposal; only same-currency amounts can follow the new value.
  const previous = augmentedTransactions.find((t) => t.id === settlement?.ownTransactionId)
  const initialTransaction = previous
    ? new AugmentedTransaction(
        new Transaction(
          0,
          email,
          previous.currencyId === currency.id ? finalAmount : previous.amount,
          previous.currencyId,
          previous.categoryId ?? transactionGroup.augmentedCategory.id,
          finalDate,
          previous.senderId,
          previous.receiverId,
          previous.note,
          previous.receiverCurrencyId,
          previous.receiverCurrencyId === currency.id ? finalAmount : previous.receiverAmount,
          null,
          null,
        ),
        null,
        null,
        previous.currency,
        previous.receiverCurrency,
        previous.category,
        previous.sender,
        previous.receiver,
      )
    : new AugmentedTransaction(
        new Transaction(
          0,
          email,
          finalAmount,
          currency.id,
          transactionGroup.augmentedCategory.id,
          finalDate,
          null,
          null,
          `Settlement with ${counterpartName}`,
          currency.id,
          finalAmount,
          null,
          null,
        ),
        null,
        null,
        currency,
        currency,
      )

  const onBooksSubmit = async (data: Partial<TransactionUpdatableFields>) => {
    await save({
      amount: data.amount!,
      currencyId: data.currencyId!,
      senderId: data.senderId ?? null,
      receiverId: data.receiverId ?? null,
      categoryId: data.categoryId ?? null,
      date: data.date!,
      note: data.note ?? '',
      receiverCurrencyId: data.receiverCurrencyId!,
      receiverAmount: data.receiverAmount!,
    })
  }

  return (
    <ContentWithHeader title={titles[mode]} action="return" withPadding withScrolling>
      {step === 'details' ? (
        <Column style={{ gap: '1.5rem', maxWidth: '32rem', margin: '0 auto', width: '100%' }}>
          {mode === 'new' && (
            <>
              <SelectOne
                label="Direction"
                value={direction}
                onChange={(value) => setDirection(value as 'paid' | 'received')}
                options={[
                  { value: 'paid', label: 'I paid' },
                  { value: 'received', label: 'I received from' },
                ]}
                type="toggle"
              />
              <SelectOne
                label="Who"
                value={chosenCounterpart}
                onChange={setCounterpart}
                options={others.map((m) => ({ value: m.email, label: m.name }))}
                type="dropdown"
              />
            </>
          )}
          {mode === 'edit' && (
            <Typography>
              {iPaid ? `You paid ${counterpartName}` : `${counterpartName} paid you`}. {counterpartName} will have to
              confirm your changes.
            </Typography>
          )}
          <FixedPointInput
            label={`Amount (${currency.symbol})`}
            value={amount}
            onChange={setAmount}
            decimalPoints={currency.decimalPoints}
          />
          <DatePicker label="Date" date={date} onChange={setDate} />
          <TextField label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            variant="contained"
            disabled={amount <= 0 || counterpartEmail === ''}
            onClick={() => (isGuest ? save(null) : setStep('books'))}
          >
            {isGuest ? 'Save' : 'Next'}
          </Button>
        </Column>
      ) : (
        <Column style={{ gap: '1rem' }}>
          <Typography color="textDisabled">
            {iPaid ? `You paid ${counterpartName}.` : `${counterpartName} paid you.`}{' '}
            {mode === 'confirm' ? 'Confirm it by recording it in your accounts.' : 'Record it in your accounts.'}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TransactionForm
            initialTransaction={initialTransaction}
            onSubmit={onBooksSubmit}
            submitText={mode === 'confirm' ? 'Confirm' : 'Save'}
            type={iPaid ? 'expense' : 'income'}
            groupContext="hidden"
          />
        </Column>
      )}
    </ContentWithHeader>
  )
}

export default SettlementPage
