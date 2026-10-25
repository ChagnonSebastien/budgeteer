import { TextField } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import { useGuestView } from '../../App'
import {
  ParseSplitType,
  SplitType,
  SplitTypeToString,
  TransactionGroupUpdatableFields,
} from '../../domain/model/transactionGroup'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import CurrencyPicker from '../currencies/CurrencyPicker'
import IsoCurrencyPicker, {
  CurrencyChoice,
  defaultCurrencyCode,
  useCurrencyChoices,
} from '../currencies/IsoCurrencyPicker'
import SelectOne from '../inputs/SelectOne'
import FormWrapper from '../shared/FormWrapper'
import { useToast } from '../shared/ToastProvider'

const NoError = ''

const validateName = (value: string) => {
  if (!value) {
    return 'Name is required'
  }

  return NoError
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

export type TransactionGroupFormFields = Omit<TransactionGroupUpdatableFields, 'members' | 'hidden'>

interface Props {
  onSubmit: (data: TransactionGroupFormFields) => Promise<void>
  submitText: string
}

const TransactionGroupForm: FC<Props> = (props) => {
  const { onSubmit, submitText } = props
  const isGuest = useGuestView()

  const { state: currencies } = useContext(CurrencyServiceContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const { defaultCurrency } = useContext(MixedAugmentation)

  const [note, setNote] = useState('')
  const [splitType, setSplitType] = useState(SplitTypeToString(SplitType.EQUAL))
  const [category, setCategory] = useState<number | null>(null)
  const augmentedCategory = useMemo(() => categories.find((c) => c.id === category), [category, categories])
  const [currency, setCurrency] = useState(defaultCurrency.id)
  const currencyChoices = useCurrencyChoices()
  const [currencyChoice, setCurrencyChoice] = useState<CurrencyChoice | null>(
    () => currencyChoices.find((c) => c.code === defaultCurrencyCode) ?? null,
  )

  const { showToast } = useToast()
  const [errors, setErrors] = useState<{
    name: FieldStatus
  }>({
    name: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
  })

  useEffect(() => {
    const nameError = validateName(note)
    setErrors((prevState) => ({
      ...prevState,
      name: {
        ...prevState.name,
        isValid: nameError === NoError,
        errorText: nameError,
      },
    }))
  }, [note])

  const isFormValid = useMemo(() => {
    return Object.values(errors).every((value) => value.isValid)
  }, [errors])

  const handleSubmit = () => {
    if (!isFormValid) {
      setErrors((prevState) => ({
        name: {
          ...prevState.name,
          hasVisited: true,
        },
      }))
      return
    }

    const groupCurrency = isGuest
      ? currencyChoice && {
          name: currencyChoice.name,
          symbol: currencyChoice.code,
          decimalPoints: currencyChoice.decimalPoints,
        }
      : currencies.find((c) => c.id === currency)
    if (!groupCurrency) {
      showToast('Choose a currency', 'error')
      return
    }

    return onSubmit({
      name: note,
      splitType: ParseSplitType(splitType)!,
      currency: isGuest ? null : currency,
      category: isGuest ? null : category,
      originalCurrency: groupCurrency.name,
      originalCurrencySymbol: groupCurrency.symbol,
      originalCurrencyDecimalPoints: groupCurrency.decimalPoints,
    }).catch((err) => {
      showToast('Unexpected error while submitting the transaction group', 'error')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      <TextField
        type="text"
        label="Name"
        variant="standard"
        sx={{ width: '100%' }}
        placeholder="Optional details"
        value={note}
        onChange={(ev) => setNote(ev.target.value as string)}
        helperText={errors.name.hasVisited ? errors.name.errorText : ''}
        error={errors.name.hasVisited && !!errors.name.errorText}
        onBlur={() =>
          setErrors((prevState) => ({
            ...prevState,
            name: {
              ...prevState.name,
              hasVisited: true,
            },
          }))
        }
      />

      <SelectOne
        label="Split Type"
        value={splitType}
        onChange={setSplitType}
        options={[
          {
            value: SplitTypeToString(SplitType.EQUAL),
            label: SplitTypeToString(SplitType.EQUAL),
          },
          {
            value: SplitTypeToString(SplitType.PERCENTAGE),
            label: SplitTypeToString(SplitType.PERCENTAGE),
          },
          {
            value: SplitTypeToString(SplitType.SHARES),
            label: SplitTypeToString(SplitType.SHARES),
          },
        ]}
        type="dropdown"
      />

      {isGuest ? (
        <IsoCurrencyPicker
          choices={currencyChoices}
          value={currencyChoice}
          onChange={setCurrencyChoice}
          label="Currency"
        />
      ) : (
        <>
          <CategoryPicker
            selectedConfig={{
              mode: 'single',
              onSelectItem: setCategory,
              selectedItem: category,
            }}
            labelText="Category"
            icon={augmentedCategory}
          />

          <CurrencyPicker
            selectedCurrencyId={currency}
            setSelectedCurrencyId={setCurrency}
            labelText="Currency"
            currencies={currencies}
          />
        </>
      )}
    </FormWrapper>
  )
}

export default TransactionGroupForm
