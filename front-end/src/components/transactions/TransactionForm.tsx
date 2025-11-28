import { Checkbox, FormControlLabel, TextField } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import Account, { AccountID } from '../../domain/model/account'
import { CategoryID } from '../../domain/model/category'
import { CurrencyID, formatAmount, parseAmount } from '../../domain/model/currency'
import Transaction, { AugmentedTransaction } from '../../domain/model/transaction'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CategoryServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import CurrencyPicker from '../currencies/CurrencyPicker'
import AccountPicker from '../inputs/AccountPicker'
import DatePicker from '../inputs/DatePicker'
import FormWrapper from '../shared/FormWrapper'
import { Row } from '../shared/Layout'

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

const validateAccount = (value: string | null, required: boolean) => {
  if (value === '' && required) {
    return 'Required account for this type of transaction'
  }

  return NoError
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'financialIncome'

interface Props {
  initialTransaction?: AugmentedTransaction
  onSubmit: (data: Partial<Omit<Transaction, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
  type?: TransactionType
}

const TransactionForm: FC<Props> = (props) => {
  const { initialTransaction, onSubmit, submitText, type: rawType } = props

  const { create: createAccount } = useContext(AccountServiceContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { rootCategory } = useContext(MixedAugmentation)
  const { default_currency } = useContext(UserContext)

  const type: 'income' | 'expense' | 'transfer' | 'financialIncome' = useMemo(() => {
    if (typeof rawType !== 'undefined') return rawType
    if (initialTransaction?.financialIncomeCurrencyId !== null) return 'financialIncome'
    if (initialTransaction?.categoryId === null) return 'transfer'
    return (initialTransaction?.sender?.isMine ?? false) ? 'expense' : 'income'
  }, [initialTransaction, rawType])

  const [amount, setAmount] = useState<string>(() => {
    if (typeof initialTransaction === 'undefined') return ''
    return `${formatAmount(initialTransaction.currency, initialTransaction.amount)}`
  })
  const sanitizedAmount = useMemo(() => `0${amount.replace(',', '')}`, [amount])
  const [currency, setCurrency] = useState<CurrencyID>(initialTransaction?.currencyId ?? default_currency!)
  const [investmentCurrency, setInvestmentCurrency] = useState<CurrencyID>(
    initialTransaction?.financialIncomeCurrencyId ?? default_currency!,
  )
  const [date, setDate] = useState(initialTransaction?.date ?? new Date())

  const [differentCurrency, setDifferentCurrency] = useState(() => {
    if (typeof initialTransaction === 'undefined') return false
    return initialTransaction.receiverCurrencyId !== initialTransaction.currencyId
  })
  const [receiverAmount, setReceiverAmount] = useState<string>(
    `${typeof initialTransaction === 'undefined' ? '' : formatAmount(initialTransaction.receiverCurrency, initialTransaction.receiverAmount)}`,
  )
  const sanitizedReceiverAmount = useMemo(() => `0${receiverAmount.replace(',', '')}`, [receiverAmount])
  const [receiverCurrency, setReceiverCurrency] = useState<CurrencyID>(
    initialTransaction?.receiverCurrencyId ?? currencies[0].id,
  )

  const [parent, setParent] = useState<CategoryID | null>(
    initialTransaction?.categoryId === null || type === 'transfer'
      ? null
      : (initialTransaction?.categoryId ?? rootCategory.id),
  )
  const [senderAccount, setSenderAccount] = useState<{ existing: boolean; id: AccountID | null; name: string }>(() => {
    if (typeof initialTransaction?.sender?.id === 'undefined') return { existing: false, id: null, name: '' }
    return { existing: true, id: initialTransaction.sender.id, name: initialTransaction.sender.name }
  })

  const [receiverAccount, setReceiverAccount] = useState<{
    existing: boolean
    id: AccountID | null
    name: string
  }>(() => {
    if (typeof initialTransaction?.receiver?.id === 'undefined') return { existing: false, id: null, name: '' }
    return { existing: true, id: initialTransaction.receiver.id, name: initialTransaction.receiver.name }
  })

  const [note, setNote] = useState(initialTransaction?.note ?? '')

  const category = useMemo(() => {
    return categories.find((c) => c.id === parent)
  }, [categories, parent])

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
    const senderError = validateAccount(senderAccount.name, type === 'expense' || type === 'transfer')
    const receiverError = validateAccount(senderAccount.name, type === 'income' || type === 'transfer')
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
  }, [sanitizedAmount, senderAccount.id, receiverAccount.id])

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

  const isFormValid = useMemo(() => {
    return Object.values(errors).every((value) => value.isValid)
  }, [errors])

  const handleSubmit = () => {
    if (!isFormValid) {
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

    let accountCreations = new Promise<Account | null>((resolve) => resolve(null))

    if (!senderAccount.existing) {
      if (senderAccount.name !== '') {
        accountCreations = createAccount({
          name: senderAccount.name,
          type: '',
          isMine: false,
          financialInstitution: '',
          initialAmounts: [],
        })
      }
    } else if (!receiverAccount.existing) {
      if (receiverAccount.name !== '') {
        accountCreations = createAccount({
          name: receiverAccount.name,
          type: '',
          isMine: false,
          financialInstitution: '',
          initialAmounts: [],
        })
      }
    }

    accountCreations.then((newAccount) => {
      onSubmit({
        amount: parseAmount(currencies.find((c) => c.id === currency)!, sanitizedAmount),
        receiverAmount: parseAmount(
          currencies.find((c) => c.id === (differentCurrency ? receiverCurrency : currency))!,
          differentCurrency ? sanitizedReceiverAmount : sanitizedAmount,
        ),
        categoryId: parent,
        receiverId: receiverAccount.id ?? (type === 'expense' ? (newAccount?.id ?? null) : null),
        senderId: senderAccount.id ?? (type === 'income' ? (newAccount?.id ?? null) : null),
        note,
        date,
        currencyId: currency,
        receiverCurrencyId: differentCurrency ? receiverCurrency : currency,
        financialIncomeCurrencyId: type === 'financialIncome' ? investmentCurrency : null,
      }).catch((err) => {
        setShowErrorToast('Unexpected error while submitting the category')
        console.error(err)
      })
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} isValid={isFormValid} errorMessage={showErrorToast}>
      <Row style={{ gap: '1rem' }}>
        <TextField
          sx={{ width: '100%' }}
          label={`Amount${differentCurrency ? ' Sent' : ''}`}
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
        <CurrencyPicker
          style={{ width: '100%', flexShrink: 2 }}
          currencies={currencies}
          selectedCurrencyId={currency}
          setSelectedCurrencyId={setCurrency}
          labelText="Currency"
          errorText={NoError}
        />
      </Row>

      {type === 'financialIncome' && (
        <CurrencyPicker
          style={{ width: '100%' }}
          currencies={currencies}
          selectedCurrencyId={investmentCurrency}
          setSelectedCurrencyId={setInvestmentCurrency}
          labelText="From investment in"
          errorText={NoError}
        />
      )}

      {typeof category !== 'undefined' && (
        <CategoryPicker
          labelText="Category"
          icon={category}
          selectedConfig={{ mode: 'single', onSelectItem: setParent, selectedItem: parent }}
        />
      )}

      <AccountPicker
        labelText="From"
        errorText={errors.sender.hasVisited ? errors.sender.errorText : ''}
        onAccountSelected={setSenderAccount}
        itemDisplayText={(item) => item?.name ?? senderAccount.name}
        valueText={senderAccount.name}
        myOwn={type !== 'income' && type !== 'financialIncome'}
        allowNew={type === 'income' || type === 'financialIncome'}
      />

      <FormControlLabel
        control={<Checkbox onChange={(ev) => setDifferentCurrency(ev.target.checked)} />}
        label="Receive in a different Currency"
      />

      {differentCurrency && (
        <Row style={{ gap: '1rem' }}>
          <TextField
            sx={{ width: '100%' }}
            type="text"
            label="Amount Received"
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
          <CurrencyPicker
            currencies={currencies}
            selectedCurrencyId={receiverCurrency}
            setSelectedCurrencyId={setReceiverCurrency}
            labelText="Currency"
            style={{ width: '100%', flexShrink: 2 }}
            errorText={NoError}
          />
        </Row>
      )}

      <DatePicker label="Date" date={date} onChange={setDate} />

      <AccountPicker
        labelText="To"
        errorText={errors.receiver.hasVisited ? errors.receiver.errorText : ''}
        itemDisplayText={(item) => item?.name ?? receiverAccount.name}
        onAccountSelected={setReceiverAccount}
        valueText={receiverAccount.name}
        myOwn={type !== 'expense'}
        allowNew={type === 'expense'}
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
    </FormWrapper>
  )
}

export default TransactionForm
