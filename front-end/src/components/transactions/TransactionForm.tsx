import {
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { ChoosableType, useTransactionTypeOptions } from './TransactionTypeChoice'
import { UserContext } from '../../App'
import Account, { AccountID, payeeFields } from '../../domain/model/account'
import { CategoryID } from '../../domain/model/category'
import { CurrencyID } from '../../domain/model/currency'
import Transaction, {
  AugmentedTransaction,
  FinancialIncomeData,
  latestCategoryWith,
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

type Field = 'amount' | 'sender' | 'receiver' | 'receiverAmount'

type AutofillBasis = {
  type: TransactionType
  baseType: ChoosableType
  senderId: AccountID | null
  receiverId: AccountID | null
  parent: CategoryID | null
  rootCategoryId: CategoryID
  augmentedTransactions: Transaction[]
}

const sameAutofillBasis = (a: AutofillBasis | null, b: AutofillBasis) =>
  a !== null && (Object.keys(b) as (keyof AutofillBasis)[]).every((key) => a[key] === b[key])

const inferredCategory = (basis: AutofillBasis): CategoryID | null => {
  if (basis.type === 'transfer' || basis.parent !== basis.rootCategoryId) return null

  const inferFromSender = basis.baseType === 'income'
  const partyId = inferFromSender ? basis.senderId : basis.receiverId
  if (partyId === null) return null

  const latestCategory = latestCategoryWith(basis.augmentedTransactions, partyId, inferFromSender)
  return latestCategory === basis.parent ? null : latestCategory
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'financialIncome'

interface Props {
  initialTransaction?: AugmentedTransaction
  onSubmit: (data: Partial<Omit<Transaction, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
  type?: TransactionType
  prefillAccountId?: AccountID | null
  prefillTransactionGroupId?: TransactionGroupID | null
  groupContext?: 'hidden' | 'locked'
  onTypeChange?: (type: ChoosableType) => void
}

type AccountSlot = { existing: boolean; id: AccountID | null; name: string }

const emptySlot: AccountSlot = { existing: false, id: null, name: '' }

const TransactionForm: FC<Props> = (props) => {
  const {
    initialTransaction,
    onSubmit,
    submitText,
    type: rawType,
    prefillAccountId,
    prefillTransactionGroupId,
    groupContext,
    onTypeChange,
  } = props

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
  const typeOptions = useTransactionTypeOptions()

  // Financial income and transaction-group membership are now opt-in toggles within
  // the form (mutually exclusive), so the base type is only income/expense/transfer.
  const [baseType, setBaseType] = useState<ChoosableType>(() => {
    if (rawType === 'income' || rawType === 'expense' || rawType === 'transfer') return rawType
    if (rawType === 'financialIncome') return 'income'
    if (initialTransaction?.financialIncomeData)
      return initialTransaction.sender?.isMine && !initialTransaction.receiver?.isMine ? 'expense' : 'income'
    if (initialTransaction?.categoryId === null) return 'transfer'
    return (initialTransaction?.sender?.isMine ?? false) ? 'expense' : 'income'
  })

  const [isFinancialIncome, setIsFinancialIncome] = useState(
    () => rawType === 'financialIncome' || !!initialTransaction?.financialIncomeData,
  )
  const [useTransactionGroup, setUseTransactionGroup] = useState(
    () => (initialTransaction?.transactionGroupData?.transactionGroupId ?? prefillTransactionGroupId ?? null) !== null,
  )

  // A financial loss (fee) is stored like a financial income, but flows out of my accounts like an expense.
  const isFinancial = isFinancialIncome && baseType !== 'transfer'
  const type: 'income' | 'expense' | 'transfer' | 'financialIncome' = isFinancial ? 'financialIncome' : baseType

  const [amount, setAmount] = useState<number>(() => initialTransaction?.amount ?? 0)
  const [currency, setCurrency] = useState<CurrencyID>(initialTransaction?.currencyId ?? default_currency!)
  const [investmentCurrency, setInvestmentCurrency] = useState<CurrencyID>(
    initialTransaction?.financialIncomeData?.relatedCurrencyId ?? default_currency!,
  )
  const [date, setDate] = useState(initialTransaction?.date ?? new Date())

  const [differentCurrency, setDifferentCurrency] = useState(() => {
    if (typeof initialTransaction === 'undefined' || initialTransaction.transactionGroupData !== null) return false
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

  const [senderAccount, setSenderAccount] = useState<AccountSlot>(() => {
    if (typeof initialTransaction?.sender?.id !== 'undefined')
      return { existing: true, id: initialTransaction.sender.id, name: initialTransaction.sender.name }
    if (prefillSenderAccount !== null)
      return { existing: true, id: prefillSenderAccount.id, name: prefillSenderAccount.name }
    return emptySlot
  })

  const [receiverAccount, setReceiverAccount] = useState<AccountSlot>(() => {
    if (typeof initialTransaction?.receiver?.id !== 'undefined')
      return { existing: true, id: initialTransaction.receiver.id, name: initialTransaction.receiver.name }
    if (prefillReceiverAccount !== null)
      return { existing: true, id: prefillReceiverAccount.id, name: prefillReceiverAccount.name }
    return emptySlot
  })

  const [note, setNote] = useState(initialTransaction?.note ?? '')

  const category = useMemo(() => {
    return categories.find((c) => c.id === parent)
  }, [categories, parent])

  const [transactionGroupId, setTransactionGroupId] = useState<TransactionGroupID | null>(
    initialTransaction?.transactionGroupData?.transactionGroupId ?? prefillTransactionGroupId ?? null,
  )
  const visibleTransactionGroups = useMemo(() => {
    return transactionGroups.filter((tg) => tg.hasJoined(email) && !tg.hidden)
  }, [transactionGroups, email])

  const transactionGroup = useMemo(() => {
    return transactionGroups.find((c) => c.id === transactionGroupId)
  }, [transactionGroups, transactionGroupId])

  const { showToast } = useToast()
  const [visited, setVisited] = useState<Record<Field, boolean>>({
    amount: false,
    sender: false,
    receiver: false,
    receiverAmount: false,
  })

  const fieldErrors: Record<Field, string> = {
    amount: validateAmount(amount),
    sender: validateAccount(senderAccount.name, baseType === 'expense' || baseType === 'transfer'),
    receiver: validateAccount(receiverAccount.name, type === 'income' || type === 'transfer'),
    receiverAmount: validateAmount(receiverAmount),
  }

  const autofillBasis: AutofillBasis = {
    type,
    baseType,
    senderId: senderAccount.id,
    receiverId: receiverAccount.id,
    parent,
    rootCategoryId: rootCategory.id,
    augmentedTransactions,
  }
  const [lastAutofillBasis, setLastAutofillBasis] = useState<AutofillBasis | null>(null)
  const [autofillCount, setAutofillCount] = useState(0)
  if (typeof initialTransaction === 'undefined' && !sameAutofillBasis(lastAutofillBasis, autofillBasis)) {
    setLastAutofillBasis(autofillBasis)
    const latestCategory = inferredCategory(autofillBasis)
    if (latestCategory !== null) {
      setParent(latestCategory)
      setAutofillCount((count) => count + 1)
    }
  }

  useEffect(() => {
    if (autofillCount > 0) showToast('Category autofilled from past behavior', 'info')
  }, [autofillCount, showToast])

  const isFormValid =
    fieldErrors.amount === NoError &&
    fieldErrors.sender === NoError &&
    fieldErrors.receiver === NoError &&
    (fieldErrors.receiverAmount === NoError || !differentCurrency)

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
      setDifferentCurrency(false)
    }
  }

  const changeType = (newType: ChoosableType) => {
    if (newType === baseType) return
    const isPayeeSwap = newType !== 'transfer' && baseType !== 'transfer'
    if (isPayeeSwap) {
      setSenderAccount(receiverAccount)
      setReceiverAccount(senderAccount)
    } else {
      // Only an account of mine can stay: the other side held a payee, which a transfer cannot use.
      if (newType === 'income' || baseType === 'income') setSenderAccount(emptySlot)
      if (newType === 'expense' || baseType === 'expense') setReceiverAccount(emptySlot)
    }
    setParent(newType === 'transfer' ? null : rootCategory.id)
    if (newType === 'transfer') {
      setIsFinancialIncome(false)
      setUseTransactionGroup(false)
      setTransactionGroupId(null)
    }
    setBaseType(newType)
    onTypeChange?.(newType)
  }

  const handleSubmit = () => {
    if (!isFormValid) {
      setVisited({ amount: true, sender: true, receiver: true, receiverAmount: true })
      return
    }

    let accountCreations = new Promise<Account | null>((resolve) => resolve(null))

    if (!senderAccount.existing) {
      if (senderAccount.name !== '') {
        accountCreations = createAccount(payeeFields(senderAccount.name))
      }
    } else if (!receiverAccount.existing) {
      if (receiverAccount.name !== '') {
        accountCreations = createAccount(payeeFields(receiverAccount.name))
      }
    }

    return accountCreations.then((newAccount) =>
      onSubmit({
        amount,
        receiverAmount: differentCurrency ? receiverAmount : amount,
        categoryId: transactionGroup?.category ?? parent,
        receiverId: receiverAccount.id ?? (baseType === 'expense' ? (newAccount?.id ?? null) : null),
        senderId: senderAccount.id ?? (baseType === 'income' ? (newAccount?.id ?? null) : null),
        note,
        date,
        currencyId: currency,
        receiverCurrencyId: differentCurrency ? receiverCurrency : currency,
        financialIncomeData: isFinancial ? new FinancialIncomeData(investmentCurrency) : null,
        transactionGroupData: transactionGroupId !== null ? new TransactionGroupData(transactionGroupId, null) : null,
      }).catch((err) => {
        showToast('Unexpected error while submitting the transaction', 'error')
        console.error(err)
      }),
    )
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      {onTypeChange && (
        <ToggleButtonGroup
          exclusive
          fullWidth
          size="small"
          value={baseType}
          onChange={(_event, value: ChoosableType | null) => value && changeType(value)}
        >
          {typeOptions.map(({ type, label, Icon }) => (
            <ToggleButton key={type} value={type} sx={{ gap: 1 }}>
              <Icon />
              {label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Stack direction="row" spacing={2}>
        <FixedPointInput
          sx={{ width: '100%' }}
          label={`Amount${differentCurrency ? ' Sent' : ''}`}
          autoFocus
          value={amount}
          onChange={setAmount}
          decimalPoints={selectedCurrency.decimalPoints}
          error={visited.amount && !!fieldErrors.amount}
          helperText={visited.amount ? fieldErrors.amount : ''}
          onBlur={() => setVisited((prevState) => ({ ...prevState, amount: true }))}
        />
        <CurrencyPicker
          sx={{ width: '100%', flexShrink: 2 }}
          currencies={currencies}
          selectedCurrencyId={currency}
          setSelectedCurrencyId={setCurrency}
          labelText="Asset"
          errorText={NoError}
        />
      </Stack>

      {!useTransactionGroup && (
        <FormControlLabel
          control={<Checkbox checked={differentCurrency} onChange={(ev) => setDifferentCurrency(ev.target.checked)} />}
          label="Receive a different asset"
        />
      )}

      {differentCurrency && (
        <Stack direction="row" spacing={2}>
          <FixedPointInput
            sx={{ width: '100%' }}
            label="Amount Received"
            value={receiverAmount}
            onChange={setReceiverAmount}
            decimalPoints={selectedReceiverCurrency.decimalPoints}
            helperText={visited.receiverAmount ? fieldErrors.receiverAmount : ''}
            error={visited.receiverAmount && !!fieldErrors.receiverAmount}
            onBlur={() => setVisited((prevState) => ({ ...prevState, receiverAmount: true }))}
          />
          <CurrencyPicker
            currencies={currencies}
            selectedCurrencyId={receiverCurrency}
            setSelectedCurrencyId={setReceiverCurrency}
            labelText="Asset"
            sx={{ width: '100%', flexShrink: 2 }}
            errorText={NoError}
          />
        </Stack>
      )}

      <DatePicker label="Date" date={date} onChange={setDate} />

      <AccountPicker
        labelText="From"
        errorText={visited.sender ? fieldErrors.sender : ''}
        onAccountSelected={setSenderAccount}
        itemDisplayText={(item) => item?.name ?? senderAccount.name}
        valueText={senderAccount.name}
        myOwn={baseType !== 'income'}
        allowNew={baseType === 'income'}
      />

      <AccountPicker
        labelText="To"
        errorText={visited.receiver ? fieldErrors.receiver : ''}
        itemDisplayText={(item) => item?.name ?? receiverAccount.name}
        onAccountSelected={setReceiverAccount}
        valueText={receiverAccount.name}
        myOwn={baseType !== 'expense'}
        allowNew={baseType === 'expense'}
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

      {baseType !== 'transfer' && typeof groupContext === 'undefined' && (
        <Stack direction="row" useFlexGap spacing={1.5} flexWrap="wrap">
          <Chip
            icon={baseType === 'expense' ? <IconLib.TbTrendingDown /> : <IconLib.TbTrendingUp />}
            label={baseType === 'expense' ? 'Financial loss' : 'Financial income'}
            variant={isFinancialIncome ? 'filled' : 'outlined'}
            color={isFinancialIncome ? 'primary' : 'default'}
            onClick={toggleFinancialIncome}
            sx={{ pl: 1, '& .MuiChip-icon': { marginLeft: 0 } }}
          />
          <Chip
            icon={<IconLib.MdGroups />}
            label="Part of a transaction group"
            variant={useTransactionGroup ? 'filled' : 'outlined'}
            color={useTransactionGroup ? 'primary' : 'default'}
            onClick={toggleTransactionGroup}
            sx={{ pl: 1, '& .MuiChip-icon': { marginLeft: 0 } }}
          />
        </Stack>
      )}

      {isFinancial && (
        <CurrencyPicker
          sx={{ width: '100%' }}
          currencies={currencies}
          selectedCurrencyId={investmentCurrency}
          setSelectedCurrencyId={setInvestmentCurrency}
          labelText={baseType === 'expense' ? 'Charged to investment in' : 'From investment in'}
          errorText={NoError}
        />
      )}

      {useTransactionGroup && groupContext !== 'hidden' && (
        <Stack direction="row" alignItems="center" spacing={2}>
          {transactionGroup?.augmentedCategory && (
            <IconCapsule
              iconName={transactionGroup.augmentedCategory.iconName}
              size="2rem"
              color={transactionGroup.augmentedCategory.iconColor}
              backgroundColor={transactionGroup.augmentedCategory.iconBackground}
            />
          )}
          {groupContext === 'locked' ? (
            <Typography sx={{ flexGrow: 1 }}>
              Transaction group: <b>{transactionGroup?.name}</b>
            </Typography>
          ) : (
            <>
              <ItemPicker
                sx={{ flexGrow: 1 }}
                items={visibleTransactionGroups}
                labelText="Transaction Group"
                itemDisplayText={(item) => item?.name ?? 'None'}
                selectedItemId={transactionGroupId}
                onSelectItem={setTransactionGroupId}
                ItemComponent={TransactionGroupCard}
                additionalItemProps={{}}
              />
              <IconButton onClick={() => setTransactionGroupId(null)}>
                <IconLib.MdCancel />
              </IconButton>
            </>
          )}
        </Stack>
      )}
    </FormWrapper>
  )
}

export default TransactionForm
