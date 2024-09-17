import { Button, Checkbox, Dialog, FormControlLabel, Snackbar, TextField } from '@mui/material'
import { DateCalendar, DateField, DateView, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { FC, FormEvent, useContext, useEffect, useMemo, useState } from 'react'
import { Omit } from 'react-router'

import AccountPicker from './AccountPicker'
import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import CurrencyPicker from './CurrencyPicker'
import IconCapsule from './IconCapsule'
import { UserContext } from '../App'
import { formatAmount, parseAmount } from '../domain/model/currency'
import Transaction, { AugmentedTransaction } from '../domain/model/transaction'
import { CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const NoError = ''

const validAmount = new RegExp(`^\\d*[.,]?\\d*$`)

const validateAmount = (value: string) => {
  if (!value) {
    return 'Amount is required'
  }

  if (!validAmount.test(value)) {
    return 'Invalid amount. Enter a number'
  }

  if (parseFloat(value) === 0) {
    return 'Amount is required'
  }

  return NoError
}

const validateAccount = (value: number | null, required: boolean) => {
  if (value === null && required) {
    return 'Required account for this type of transaction'
  }

  return NoError
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

interface Props {
  initialTransaction?: AugmentedTransaction
  onSubmit: (data: Omit<Transaction, 'id'>) => Promise<void>
  submitText: string
  type?: 'income' | 'expense' | 'transfer'
}

const TransactionForm: FC<Props> = (props) => {
  const { initialTransaction, onSubmit, submitText, type: rawType } = props

  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { default_currency } = useContext(UserContext)

  const type: 'income' | 'expense' | 'transfer' = useMemo(() => {
    if (typeof rawType !== 'undefined') return rawType
    if (initialTransaction?.categoryId === null) return 'transfer'
    return (initialTransaction?.sender?.isMine ?? false) ? 'expense' : 'income'
  }, [initialTransaction, rawType])

  const [amount, setAmount] = useState<string>(() => {
    if (typeof initialTransaction === 'undefined') return ''
    return `${formatAmount(initialTransaction.currency, initialTransaction.amount)}`
  })
  const sanitizedAmount = useMemo(() => `0${amount.replace(',', '')}`, [amount])
  const [currency, setCurrency] = useState<number>(initialTransaction?.currencyId ?? default_currency!)
  const [date, setDate] = useState(initialTransaction?.date ?? new Date())
  const [dateView, setDateView] = useState<DateView>('day')
  const [showDateModal, setShowDateModal] = useState(false)

  const [differentCurrency, setDifferentCurrency] = useState(() => {
    if (typeof initialTransaction === 'undefined') return false
    return initialTransaction.receiverCurrencyId !== initialTransaction.currencyId
  })
  const [receiverAmount, setReceiverAmount] = useState<string>(
    `${typeof initialTransaction === 'undefined' ? '' : formatAmount(initialTransaction.receiverCurrency, initialTransaction.receiverAmount)}`,
  )
  const sanitizedReceiverAmount = useMemo(() => `0${receiverAmount.replace(',', '')}`, [receiverAmount])
  const [receiverCurrency, setReceiverCurrency] = useState<number>(
    initialTransaction?.receiverCurrencyId ?? currencies[0].id,
  )

  const [parent, setParent] = useState<number | null>(
    initialTransaction?.categoryId === null || type === 'transfer'
      ? null
      : (initialTransaction?.categoryId ?? rootCategory.id),
  )
  const [senderAccountId, setSenderAccountId] = useState<number | null>(initialTransaction?.senderId ?? null)
  const [receiverAccountId, setReceiverAccountId] = useState<number | null>(initialTransaction?.receiverId ?? null)

  const [note, setNote] = useState('')

  const category = useMemo(() => {
    return categories.find((c) => c.id === parent)
  }, [categories, parent])

  const [showParentModal, setShowCategoryModal] = useState(false)

  const [showErrorToast, setShowErrorToast] = useState('')
  const [errors, setErrors] = useState<{
    amount: FieldStatus
    sender: FieldStatus
    receiver: FieldStatus
    receiverAmount: FieldStatus
  }>({
    amount: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    sender: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    receiver: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    receiverAmount: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
  })

  useEffect(() => {
    const amountError = validateAmount(sanitizedAmount)
    const senderError = validateAccount(senderAccountId, type === 'expense' || type === 'transfer')
    const receiverError = validateAccount(receiverAccountId, type === 'income' || type === 'transfer')
    setErrors((prevState) => ({
      ...prevState,
      amount: {
        ...prevState.amount,
        isValid: amountError === NoError,
        errorText: amountError,
      },
      sender: {
        ...prevState.sender,
        isValid: senderError === NoError,
        errorText: senderError,
      },
      receiver: {
        ...prevState.receiver,
        isValid: receiverError === NoError,
        errorText: receiverError,
      },
    }))
  }, [sanitizedAmount, senderAccountId, receiverAccountId])

  useEffect(() => {
    const receiverAmountError = validateAmount(sanitizedReceiverAmount)
    setErrors((prevState) => ({
      ...prevState,
      receiverAmount: {
        ...prevState.receiverAmount,
        isValid: receiverAmountError === NoError || !differentCurrency,
        errorText: receiverAmountError,
      },
    }))
  }, [sanitizedReceiverAmount, differentCurrency])

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (Object.values(errors).some((value) => !value.isValid)) {
      setErrors((prevState) => ({
        amount: {
          ...prevState.amount,
          hasVisited: true,
        },
        sender: {
          ...prevState.sender,
          hasVisited: true,
        },
        receiver: {
          ...prevState.receiver,
          hasVisited: true,
        },
        receiverAmount: {
          ...prevState.receiverAmount,
          hasVisited: true,
        },
      }))
      return
    }

    onSubmit({
      amount: parseAmount(currencies.find((c) => c.id === currency)!, sanitizedAmount),
      receiverAmount: parseAmount(
        currencies.find((c) => c.id === (differentCurrency ? receiverCurrency : currency))!,
        differentCurrency ? sanitizedReceiverAmount : sanitizedAmount,
      ),
      categoryId: parent,
      receiverId: receiverAccountId ?? null,
      senderId: senderAccountId ?? null,
      note,
      date,
      currencyId: currency,
      receiverCurrencyId: differentCurrency ? receiverCurrency : currency,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting the category')
      console.error(err)
    })
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <form noValidate onSubmit={handleSubmit}>
        <div style={{ display: 'flex' }}>
          <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>Form</div>
          <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
        </div>
        <div style={{ padding: '1rem', border: '1px grey solid', borderTop: 0 }}>
          <div style={{ display: 'flex' }}>
            <TextField
              sx={{ width: '100%' }}
              type="text"
              label="Amount"
              variant="standard"
              autoFocus
              value={amount}
              onChange={(ev) => setAmount(ev.target.value as string)}
              error={errors.amount.hasVisited && !!errors.amount.errorText}
              helperText={errors.amount.hasVisited ? errors.amount.errorText : ''}
              onBlur={() => {
                setErrors((prevState) => ({
                  ...prevState,
                  amount: { ...prevState.amount, hasVisited: true },
                }))
              }}
            />
            <div style={{ width: '3rem' }} />
            <CurrencyPicker
              style={{ width: '100%', flexShrink: 2 }}
              currencies={currencies}
              selectedCurrencyId={currency}
              setSelectedCurrencyId={setCurrency}
              labelText="Currency"
              errorText={NoError}
            />
          </div>

          {typeof category !== 'undefined' && (
            <>
              <div
                style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setShowCategoryModal(true)}
              >
                <IconCapsule
                  flexShrink={0}
                  iconName={category.iconName}
                  size="2rem"
                  color={category.iconColor}
                  backgroundColor={category.iconBackground}
                />
                <div style={{ width: '1rem', flexShrink: 0 }} />
                <TextField
                  sx={{ width: '100%' }}
                  type="text"
                  label="Category"
                  variant="standard"
                  placeholder={typeof rootCategory === 'undefined' ? 'Loading...' : undefined}
                  value={categories?.find((c) => c.id === parent)?.name}
                  onFocus={(ev) => {
                    setShowCategoryModal(true)
                    ev.target.blur()
                  }}
                />
              </div>
              <Dialog open={showParentModal} onClose={() => setShowCategoryModal(false)}>
                <ContentWithHeader title="Select Icon" button="return" onCancel={() => setShowCategoryModal(false)}>
                  <CategoryList
                    categories={categories}
                    onSelect={(newParent) => {
                      setParent(newParent)
                      setShowCategoryModal(false)
                    }}
                  />
                </ContentWithHeader>
              </Dialog>
            </>
          )}

          <AccountPicker
            labelText="From"
            errorText={errors.sender.hasVisited ? errors.sender.errorText : ''}
            setSelectedAccountId={setSenderAccountId}
            selectedAccountId={senderAccountId}
            myOwn={parent === null || type === 'expense'}
          />

          {type === 'transfer' && (
            <FormControlLabel
              control={<Checkbox onChange={(ev) => setDifferentCurrency(ev.target.checked)} />}
              label="TransferCurrencies"
            />
          )}

          {differentCurrency && (
            <div style={{ display: 'flex' }}>
              <TextField
                type="text"
                label="Amount of transfered currency"
                variant="standard"
                value={receiverAmount}
                onChange={(ev) => setReceiverAmount(ev.target.value as string)}
                helperText={errors.receiverAmount.hasVisited ? errors.receiverAmount.errorText : ''}
                error={errors.receiverAmount.hasVisited && !!errors.receiverAmount.errorText}
                onBlur={() =>
                  setErrors((prevState) => ({
                    ...prevState,
                    receiverAmount: { ...prevState.receiverAmount, hasVisited: true },
                  }))
                }
              />
              <div style={{ width: '3rem' }} />
              <CurrencyPicker
                currencies={currencies}
                selectedCurrencyId={receiverCurrency}
                setSelectedCurrencyId={setReceiverCurrency}
                labelText="Transfer to:"
                style={{ flexShrink: 2 }}
                errorText={NoError}
              />
            </div>
          )}

          <DateField
            label="Date"
            value={dayjs(date)}
            onFocus={(ev) => {
              setShowDateModal(true)
              ev.preventDefault()
              ev.target.blur()
            }}
            variant="standard"
            sx={{ width: '100%' }}
          />

          <Dialog open={showDateModal} onClose={() => setShowDateModal(false)}>
            <DateCalendar
              views={['year', 'month', 'day']}
              value={dayjs(date)}
              onChange={(newDate: Dayjs) => {
                setDate(newDate.toDate())
                if (dateView === 'day') setShowDateModal(false)
              }}
              onViewChange={(view) => {
                setDateView(view)
                console.log(view)
              }}
            />
          </Dialog>

          <AccountPicker
            labelText="To"
            errorText={errors.receiver.hasVisited ? errors.receiver.errorText : ''}
            setSelectedAccountId={setReceiverAccountId}
            selectedAccountId={receiverAccountId}
            myOwn={parent === null || type === 'income'}
          />

          <TextField
            type="text"
            label="Note"
            variant="standard"
            sx={{ width: '100%' }}
            placeholder="Optional details"
            value={note}
            onChange={(ev) => setNote(ev.target.value as string)}
          />
        </div>
        <div style={{ height: '1rem' }} />
        <Button type="submit">{submitText}</Button>

        <Snackbar
          open={showErrorToast !== ''}
          message={showErrorToast}
          autoHideDuration={5000}
          onClose={() => setShowErrorToast('')}
        />
      </form>
    </LocalizationProvider>
  )
}

export default TransactionForm
