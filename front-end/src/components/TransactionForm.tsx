import { IonButton, IonCheckbox, IonInput, IonModal, IonToast } from '@ionic/react'
import { FC, FormEvent, useContext, useEffect, useMemo, useState } from 'react'
import { Omit } from 'react-router'

import AccountPicker from './AccountPicker'
import { CategoryList } from './CategoryList'
import ContentWithHeader from './ContentWithHeader'
import CurrencyPicker from './CurrencyPicker'
import IconCapsule from './IconCapsule'
import { UserContext } from '../App'
import Transaction from '../domain/model/transaction'
import { AccountServiceContext, CategoryServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

const NoError = 'nil'

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
  initialTransaction?: Transaction
  onSubmit: (data: Omit<Transaction, 'id'>) => Promise<void>
  submitText: string
  type?: 'income' | 'expense' | 'transfer'
}

const TransactionForm: FC<Props> = (props) => {
  const { initialTransaction, onSubmit, submitText, type: rawType } = props

  const { state: categories, root: rootCategory } = useContext(CategoryServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { state: accounts } = useContext(AccountServiceContext)
  const { default_currency } = useContext(UserContext)

  const type: 'income' | 'expense' | 'transfer' = useMemo(() => {
    if (typeof rawType !== 'undefined') return rawType
    if (initialTransaction?.categoryId === null) return 'transfer'
    return (accounts.find((a) => a.id === initialTransaction?.senderId)?.isMine ?? false) ? 'expense' : 'income'
  }, [initialTransaction, rawType, accounts])

  const [amount, setAmount] = useState<string>(
    `${typeof initialTransaction === 'undefined' ? '' : initialTransaction.amount / Math.pow(10, currencies.find((c) => c.id === initialTransaction.currencyId)?.decimalPoints ?? 2)}`,
  )
  const sanitizedAmount = useMemo(() => `0${amount.replace(',', '.')}`, [amount])
  const [currency, setCurrency] = useState<number>(initialTransaction?.currencyId ?? default_currency!)

  const [differentCurrency, setDifferentCurrency] = useState(() => {
    if (typeof initialTransaction === 'undefined') return false
    return initialTransaction.receiverCurrencyId !== initialTransaction.currencyId
  })
  const [receiverAmount, setReceiverAmount] = useState<string>(
    `${typeof initialTransaction === 'undefined' ? '' : initialTransaction.receiverAmount / Math.pow(10, currencies.find((c) => c.id === initialTransaction.receiverCurrencyId)?.decimalPoints ?? 2)}`,
  )
  const sanitizedReceiverAmount = useMemo(() => `0${receiverAmount.replace(',', '.')}`, [receiverAmount])
  const [receiverCurrency, setReceiverCurrency] = useState<number>(
    initialTransaction?.receiverCurrencyId ?? currencies[0].id,
  )

  const [parent, setParent] = useState<number | null>(
    initialTransaction?.categoryId === null || type === 'transfer'
      ? null
      : (initialTransaction?.categoryId ?? rootCategory.id),
  )
  const [sender, setSender] = useState<number | null>(initialTransaction?.senderId ?? null)
  const [receiver, setReceiver] = useState<number | null>(initialTransaction?.receiverId ?? null)
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
    const senderError = validateAccount(sender, type === 'expense' || type === 'transfer')
    const receiverError = validateAccount(receiver, type === 'income' || type === 'transfer')
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
  }, [sanitizedAmount, sender, receiver])

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

    if (differentCurrency && currency === receiverCurrency) {
      setShowErrorToast('A transfer of currency requires different currencies in both accounts')
      return
    }

    onSubmit({
      amount: Math.floor(
        parseFloat(sanitizedAmount) * Math.pow(10, currencies.find((c) => c.id === currency)?.decimalPoints ?? 2),
      ),
      receiverAmount: Math.floor(
        parseFloat(differentCurrency ? sanitizedReceiverAmount : sanitizedAmount) *
          Math.pow(
            10,
            currencies.find((c) => c.id === (differentCurrency ? receiverCurrency : currency))?.decimalPoints ?? 2,
          ),
      ),
      categoryId: parent,
      receiverId: receiver ?? null,

      senderId: sender ?? null,
      note,
      date: initialTransaction?.date ?? new Date(),
      currencyId: currency,
      receiverCurrencyId: differentCurrency ? receiverCurrency : currency,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while creating the category')
      console.error(err)
    })
  }

  const classNameFromStatus = (status: FieldStatus) => {
    return `${!status.isValid && 'ion-invalid'} ${status.hasVisited && 'ion-touched'}`
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div style={{ display: 'flex' }}>
        <div style={{ color: 'gray', margin: '0 1rem', transform: 'translate(0, 0.5rem)' }}>Form</div>
        <div style={{ borderBottom: '1px grey solid', flexGrow: 1 }} />
      </div>
      <div style={{ padding: '1rem', border: '1px grey solid', borderTop: 0 }}>
        <div style={{ display: 'flex' }}>
          <IonInput
            type="text"
            className={classNameFromStatus(errors.amount)}
            label="Amount"
            labelPlacement="floating"
            value={amount}
            onIonInput={(ev) => setAmount(ev.target.value as string)}
            errorText={errors.amount.errorText}
            onIonBlur={() =>
              setErrors((prevState) => ({
                ...prevState,
                amount: { ...prevState.amount, hasVisited: true },
              }))
            }
          />
          <div style={{ width: '3rem' }} />
          <CurrencyPicker
            currencies={currencies}
            selectedCurrencyId={currency}
            setSelectedCurrencyId={setCurrency}
            labelText="Currency"
            style={{ flexShrink: 2 }}
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
              <IonInput
                type="text"
                label="Category"
                labelPlacement="floating"
                placeholder={typeof rootCategory === 'undefined' ? 'Loading...' : undefined}
                value={categories?.find((c) => c.id === parent)?.name}
                onFocus={() => setShowCategoryModal(true)}
                errorText="None"
              />
            </div>
            <IonModal isOpen={showParentModal} onWillDismiss={() => setShowCategoryModal(false)}>
              <ContentWithHeader title="Select Icon" button="return" onCancel={() => setShowCategoryModal(false)}>
                <CategoryList
                  categories={categories}
                  onSelect={(newParent) => {
                    setParent(newParent)
                    setShowCategoryModal(false)
                  }}
                />
              </ContentWithHeader>
            </IonModal>
          </>
        )}

        <AccountPicker
          labelText="From"
          className={classNameFromStatus(errors.sender)}
          errorText={errors.sender.errorText}
          setSelectedAccountId={setSender}
          selectedAccountId={sender}
          myOwn={parent === null || type === 'expense'}
        />

        {type === 'transfer' && (
          <IonCheckbox
            labelPlacement="end"
            onIonChange={(ev) => setDifferentCurrency(ev.detail.checked)}
            style={{ marginTop: '.5rem' }}
          >
            Transfer currencies
          </IonCheckbox>
        )}

        {differentCurrency && (
          <div style={{ display: 'flex' }}>
            <IonInput
              type="text"
              className={classNameFromStatus(errors.receiverAmount)}
              label="Amount of transfered currency"
              labelPlacement="stacked"
              value={receiverAmount}
              onIonInput={(ev) => setReceiverAmount(ev.target.value as string)}
              errorText={errors.receiverAmount.errorText}
              onIonBlur={() =>
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

        <AccountPicker
          labelText="To"
          className={classNameFromStatus(errors.receiver)}
          errorText={errors.receiver.errorText}
          setSelectedAccountId={setReceiver}
          selectedAccountId={receiver}
          myOwn={parent === null || type === 'income'}
        />

        <IonInput
          type="text"
          label="Note"
          labelPlacement="stacked"
          placeholder="Optional details"
          value={note}
          onIonInput={(ev) => setNote(ev.target.value as string)}
          errorText="_blank"
        />
      </div>
      <div style={{ height: '1rem' }} />
      <IonButton type="submit" expand="block">
        {submitText}
      </IonButton>

      <IonToast
        isOpen={showErrorToast !== ''}
        message={showErrorToast}
        duration={5000}
        onDidDismiss={() => setShowErrorToast('')}
      />
    </form>
  )
}

export default TransactionForm
