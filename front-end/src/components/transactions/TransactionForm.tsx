import { Checkbox, Chip, FormControlLabel, IconButton, TextField } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { UserContext } from '../../App'
import Account, { AccountID } from '../../domain/model/account'
import { CategoryID } from '../../domain/model/category'
import { CurrencyID } from '../../domain/model/currency'
import Transaction, {
  AugmentedTransaction,
  FinancialIncomeData,
  TransactionGroupData,
} from '../../domain/model/transaction'
import { TransactionGroupID } from '../../domain/model/transactionGroup'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext, CategoryServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import CurrencyPicker from '../currencies/CurrencyPicker'
import IconCapsule from '../icons/IconCapsule'
import { IconToolsContext } from '../icons/IconTools'
import AccountPicker from '../inputs/AccountPicker'
import DatePicker from '../inputs/DatePicker'
import { FixedPointInput } from '../inputs/FixedPointInput'
import ItemPicker from '../inputs/ItemPicker'
import FormWrapper from '../shared/FormWrapper'
import { Row } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'
import { TransactionGroupCard } from '../transactionGroup/TransactionGroupCard'

const NoError = ''

const validateAmount = (value: number) => {
  if (!value) {
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
  prefillAccountId?: AccountID | null
}

const TransactionForm: FC<Props> = (props) => {
  const { initialTransaction, onSubmit, submitText, type: rawType, prefillAccountId } = props

  const { create: createAccount, state: accounts } = useContext(AccountServiceContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const {
    rootCategory,
    augmentedTransactionGroups: transactionGroups,
    augmentedTransactions,
  } = useContext(MixedAugmentation)
  const { default_currency, email } = useContext(UserContext)
  const { IconLib } = useContext(IconToolsContext)

  // Financial income and transaction-group membership are now opt-in toggles within
  // the form (mutually exclusive), so the base type is only income/expense/transfer.
  const baseType: 'income' | 'expense' | 'transfer' = useMemo(() => {
    if (rawType === 'income' || rawType === 'expense' || rawType === 'transfer') return rawType
    if (rawType === 'financialIncome' || initialTransaction?.financialIncomeData) return 'income'
    if (initialTransaction?.categoryId === null) return 'transfer'
    return (initialTransaction?.sender?.isMine ?? false) ? 'expense' : 'income'
  }, [initialTransaction, rawType])

  const [isFinancialIncome, setIsFinancialIncome] = useState(
    () => rawType === 'financialIncome' || !!initialTransaction?.financialIncomeData,
  )
  const [useTransactionGroup, setUseTransactionGroup] = useState(
    () => (initialTransaction?.transactionGroupData ?? null) !== null,
  )

  const type: 'income' | 'expense' | 'transfer' | 'financialIncome' = isFinancialIncome ? 'financialIncome' : baseType

  const [amount, setAmount] = useState<number>(() => initialTransaction?.amount ?? 0)
  const [currency, setCurrency] = useState<CurrencyID>(initialTransaction?.currencyId ?? default_currency!)
  const [investmentCurrency, setInvestmentCurrency] = useState<CurrencyID>(
    initialTransaction?.financialIncomeData?.relatedCurrencyId ?? default_currency!,
  )
  const [date, setDate] = useState(initialTransaction?.date ?? new Date())

  const [differentCurrency, setDifferentCurrency] = useState(() => {
    if (typeof initialTransaction === 'undefined') return false
    return initialTransaction.receiverCurrencyId !== initialTransaction.currencyId
  })
  const [receiverAmount, setReceiverAmount] = useState<number>(() => initialTransaction?.receiverAmount ?? 0)
  const [receiverCurrency, setReceiverCurrency] = useState<CurrencyID>(
    initialTransaction?.receiverCurrencyId ?? currencies[0].id,
  )

  const selectedCurrency = useMemo(() => currencies.find((c) => c.id === currency)!, [currencies, currency])
  const selectedReceiverCurrency = useMemo(
    () => currencies.find((c) => c.id === receiverCurrency)!,
    [currencies, receiverCurrency],
  )

  const [parent, setParent] = useState<CategoryID | null>(
    initialTransaction?.categoryId === null || type === 'transfer'
      ? null
      : (initialTransaction?.categoryId ?? rootCategory.id),
  )
  // Prefill an account from the single selected account filter we came from: the
  // own slot for an own account (sender on expense, receiver on income), or the
  // second-party slot otherwise (receiver on expense, sender on income).
  const prefillAccount =
    typeof initialTransaction === 'undefined' && prefillAccountId != null
      ? (accounts.find((a) => a.id === prefillAccountId) ?? null)
      : null
  const prefillSenderAccount =
    prefillAccount !== null &&
    ((baseType === 'expense' && prefillAccount.isMine) || (baseType === 'income' && !prefillAccount.isMine))
      ? prefillAccount
      : null
  const prefillReceiverAccount =
    prefillAccount !== null &&
    ((baseType === 'expense' && !prefillAccount.isMine) || (baseType === 'income' && prefillAccount.isMine))
      ? prefillAccount
      : null

  const [senderAccount, setSenderAccount] = useState<{ existing: boolean; id: AccountID | null; name: string }>(() => {
    if (typeof initialTransaction?.sender?.id !== 'undefined')
      return { existing: true, id: initialTransaction.sender.id, name: initialTransaction.sender.name }
    if (prefillSenderAccount !== null)
      return { existing: true, id: prefillSenderAccount.id, name: prefillSenderAccount.name }
    return { existing: false, id: null, name: '' }
  })

  const [receiverAccount, setReceiverAccount] = useState<{
    existing: boolean
    id: AccountID | null
    name: string
  }>(() => {
    if (typeof initialTransaction?.receiver?.id !== 'undefined')
      return { existing: true, id: initialTransaction.receiver.id, name: initialTransaction.receiver.name }
    if (prefillReceiverAccount !== null)
      return { existing: true, id: prefillReceiverAccount.id, name: prefillReceiverAccount.name }
    return { existing: false, id: null, name: '' }
  })

  const [note, setNote] = useState(initialTransaction?.note ?? '')

  const category = useMemo(() => {
    return categories.find((c) => c.id === parent)
  }, [categories, parent])

  const [transactionGroupId, setTransactionGroupId] = useState<TransactionGroupID | null>(
    initialTransaction?.transactionGroupData?.transactionGroupId ?? null,
  )
  const visibleTransactionGroups = useMemo(() => {
    return transactionGroups.filter((tg) => tg.hasJoined(email) && !tg.hidden)
  }, [transactionGroups])

  const transactionGroup = useMemo(() => {
    return transactionGroups.find((c) => c.id === transactionGroupId)
  }, [transactionGroups, transactionGroupId])

  const { showToast } = useToast()
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
    const amountError = validateAmount(amount)
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
  }, [amount, senderAccount.id, receiverAccount.id, type])

  useEffect(() => {
    const receiverAmountError = validateAmount(receiverAmount)
    setErrors((prevState) => ({
      ...prevState,
      receiverAmount: {
        ...prevState.receiverAmount,
        isValid: receiverAmountError === NoError || !differentCurrency,
        errorText: receiverAmountError,
      },
    }))
  }, [receiverAmount, differentCurrency])

  useEffect(() => {
    if (typeof initialTransaction !== 'undefined') return
    if (type === 'transfer') return
    if (parent !== rootCategory.id) return

    const inferFromSender = type === 'income' || type === 'financialIncome'
    const partyId = inferFromSender ? senderAccount.id : receiverAccount.id
    if (partyId === null) return

    let latest: AugmentedTransaction | undefined
    for (const transaction of augmentedTransactions) {
      const matches = inferFromSender ? transaction.senderId === partyId : transaction.receiverId === partyId
      if (matches && transaction.categoryId !== null) {
        latest = transaction
        break
      }
    }

    if (typeof latest === 'undefined' || latest.categoryId === null || latest.categoryId === parent) return

    setParent(latest.categoryId)
    showToast('Category autofilled from past behavior', 'info')
  }, [
    type,
    senderAccount.id,
    receiverAccount.id,
    parent,
    augmentedTransactions,
    initialTransaction,
    rootCategory.id,
    showToast,
  ])

  const isFormValid = useMemo(() => {
    return Object.values(errors).every((value) => value.isValid)
  }, [errors])

  const toggleFinancialIncome = () => {
    if (isFinancialIncome) {
      setIsFinancialIncome(false)
    } else {
      setIsFinancialIncome(true)
      setUseTransactionGroup(false)
      setTransactionGroupId(null)
    }
  }

  const toggleTransactionGroup = () => {
    if (useTransactionGroup) {
      setUseTransactionGroup(false)
      setTransactionGroupId(null)
    } else {
      setUseTransactionGroup(true)
      setIsFinancialIncome(false)
    }
  }

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

    return accountCreations.then((newAccount) =>
      onSubmit({
        amount,
        receiverAmount: differentCurrency ? receiverAmount : amount,
        categoryId: transactionGroup?.category ?? parent,
        receiverId: receiverAccount.id ?? (type === 'expense' ? (newAccount?.id ?? null) : null),
        senderId: senderAccount.id ?? (type === 'income' ? (newAccount?.id ?? null) : null),
        note,
        date,
        currencyId: currency,
        receiverCurrencyId: differentCurrency ? receiverCurrency : currency,
        financialIncomeData: type === 'financialIncome' ? new FinancialIncomeData(investmentCurrency) : null,
        transactionGroupData: transactionGroupId !== null ? new TransactionGroupData(transactionGroupId, null) : null,
      }).catch((err) => {
        showToast('Unexpected error while submitting the transaction', 'error')
        console.error(err)
      }),
    )
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} isValid={isFormValid}>
      <Row style={{ gap: '1rem' }}>
        <FixedPointInput
          sx={{ width: '100%' }}
          label={`Amount${differentCurrency ? ' Sent' : ''}`}
          autoFocus
          value={amount}
          onChange={setAmount}
          decimalPoints={selectedCurrency.decimalPoints}
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

      <FormControlLabel
        control={<Checkbox onChange={(ev) => setDifferentCurrency(ev.target.checked)} />}
        label="Receive in a different Currency"
      />

      {differentCurrency && (
        <Row style={{ gap: '1rem' }}>
          <FixedPointInput
            sx={{ width: '100%' }}
            label="Amount Received"
            value={receiverAmount}
            onChange={setReceiverAmount}
            decimalPoints={selectedReceiverCurrency.decimalPoints}
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
        labelText="From"
        errorText={errors.sender.hasVisited ? errors.sender.errorText : ''}
        onAccountSelected={setSenderAccount}
        itemDisplayText={(item) => item?.name ?? senderAccount.name}
        valueText={senderAccount.name}
        myOwn={type !== 'income' && type !== 'financialIncome'}
        allowNew={type === 'income' || type === 'financialIncome'}
      />

      <AccountPicker
        labelText="To"
        errorText={errors.receiver.hasVisited ? errors.receiver.errorText : ''}
        itemDisplayText={(item) => item?.name ?? receiverAccount.name}
        onAccountSelected={setReceiverAccount}
        valueText={receiverAccount.name}
        myOwn={type !== 'expense'}
        allowNew={type === 'expense'}
      />

      {transactionGroupId === null && typeof category !== 'undefined' && (
        <CategoryPicker
          labelText="Category"
          icon={category}
          selectedConfig={{ mode: 'single', onSelectItem: setParent, selectedItem: parent }}
        />
      )}

      <TextField
        type="text"
        label="Note"
        variant="standard"
        sx={{ width: '100%' }}
        placeholder="Optional details"
        value={note}
        onChange={(ev) => setNote(ev.target.value as string)}
      />

      {baseType !== 'transfer' && (
        <Row style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          {baseType === 'income' && (
            <Chip
              icon={<IconLib.BsGraphUp />}
              label="Financial income"
              variant={isFinancialIncome ? 'filled' : 'outlined'}
              color={isFinancialIncome ? 'primary' : 'default'}
              onClick={toggleFinancialIncome}
              sx={{ pl: 1, '& .MuiChip-icon': { marginLeft: 0 } }}
            />
          )}
          <Chip
            icon={<IconLib.MdGroups />}
            label="Part of a transaction group"
            variant={useTransactionGroup ? 'filled' : 'outlined'}
            color={useTransactionGroup ? 'primary' : 'default'}
            onClick={toggleTransactionGroup}
            sx={{ pl: 1, '& .MuiChip-icon': { marginLeft: 0 } }}
          />
        </Row>
      )}

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

      {useTransactionGroup && (
        <Row style={{ justifyContent: 'stretch', alignItems: 'center', gap: '1rem' }}>
          {transactionGroup?.augmentedCategory && (
            <IconCapsule
              iconName={transactionGroup.augmentedCategory.iconName}
              size="2rem"
              color={transactionGroup.augmentedCategory.iconColor}
              backgroundColor={transactionGroup.augmentedCategory.iconBackground}
            />
          )}
          <ItemPicker
            style={{ flexGrow: 1 }}
            items={visibleTransactionGroups}
            labelText="Transaction Group"
            itemDisplayText={(item) => item?.name ?? 'None'}
            selectedItemId={transactionGroupId}
            onSelectItem={setTransactionGroupId}
            ItemComponent={TransactionGroupCard}
            additionalItemProps={{}}
          />
          <IconButton onClick={() => setTransactionGroupId(null)}>
            <IconLib.IoCloseCircle />
          </IconButton>
        </Row>
      )}
    </FormWrapper>
  )
}

export default TransactionForm
