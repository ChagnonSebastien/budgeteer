import { TextField } from '@mui/material'
import { FC, useContext, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import TransactionGroup, { Email } from '../../domain/model/transactionGroup'
import UnconfirmedTransaction from '../../domain/model/unconfirmedTransaction'
import DatePicker from '../inputs/DatePicker'
import { FixedPointInput } from '../inputs/FixedPointInput'
import SelectOne from '../inputs/SelectOne'
import FormWrapper from '../shared/FormWrapper'

export interface UnconfirmedTransactionFormFields {
  owner: Email
  amount: number
  date: Date
  note: string
}

interface Props {
  transactionGroup: TransactionGroup
  initialUnconfirmedTransaction?: UnconfirmedTransaction
  onSubmit: (data: UnconfirmedTransactionFormFields) => Promise<void>
  submitText: string
}

const UnconfirmedTransactionForm: FC<Props> = (props) => {
  const { transactionGroup, initialUnconfirmedTransaction, onSubmit, submitText } = props

  const { email, authentification_method } = useContext(UserContext)

  // Full accounts record their own payments as regular transactions; only guests may pick themselves.
  const payerOptions = useMemo(
    () =>
      transactionGroup.members.filter(
        (member) =>
          authentification_method === 'guest' ||
          member.email !== email ||
          member.email === initialUnconfirmedTransaction?.owner,
      ),
    [transactionGroup.members, authentification_method, email, initialUnconfirmedTransaction?.owner],
  )

  const [owner, setOwner] = useState<Email>(
    initialUnconfirmedTransaction?.owner ??
      payerOptions.find((m) => m.email === email)?.email ??
      payerOptions[0]?.email,
  )
  const [amount, setAmount] = useState(initialUnconfirmedTransaction?.amount ?? 0)
  const [date, setDate] = useState(initialUnconfirmedTransaction?.date ?? new Date())
  const [note, setNote] = useState(initialUnconfirmedTransaction?.note ?? '')
  const [amountVisited, setAmountVisited] = useState(false)

  const amountError = amount <= 0 ? 'Amount is required' : ''

  const handleSubmit = async () => {
    if (amountError) {
      setAmountVisited(true)
      return
    }
    if (!owner) return

    await onSubmit({ owner, amount, date, note })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      <SelectOne
        label="Payed by"
        value={owner}
        onChange={setOwner}
        options={payerOptions.map((member) => ({ value: member.email, label: member.name }))}
        type="dropdown"
      />

      <FixedPointInput
        label="Amount"
        value={amount}
        onChange={setAmount}
        decimalPoints={transactionGroup.originalCurrencyDecimalPoints}
        error={amountVisited && !!amountError}
        helperText={amountVisited ? amountError : ''}
        onBlur={() => setAmountVisited(true)}
      />

      <DatePicker label="Date" date={date} onChange={setDate} />

      <TextField
        type="text"
        label="Note"
        variant="standard"
        sx={{ width: '100%' }}
        placeholder="Optional details"
        value={note}
        onChange={(ev) => setNote(ev.target.value)}
      />
    </FormWrapper>
  )
}

export default UnconfirmedTransactionForm
