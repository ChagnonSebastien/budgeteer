import { TextField } from '@mui/material'
import { FC, useContext, useEffect, useMemo, useState } from 'react'

import TransactionGroup, { ParseSplitType, SplitType, SplitTypeToString } from '../../domain/model/transactionGroup'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CategoryServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CategoryPicker from '../categories/CategoryPicker'
import CurrencyPicker from '../currencies/CurrencyPicker'
import SelectOne from '../inputs/SelectOne'
import FormWrapper from '../shared/FormWrapper'

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

interface Props {
  initialTransactionGroup?: TransactionGroup
  onSubmit: (data: Partial<Omit<TransactionGroup, 'id' | 'members' | 'originalCurrency'>>) => Promise<void>
  submitText: string
}

const TransactionGroupForm: FC<Props> = (props) => {
  const { initialTransactionGroup, onSubmit, submitText } = props

  const { state: currencies } = useContext(CurrencyServiceContext)
  const { state: categories } = useContext(CategoryServiceContext)
  const { defaultCurrency } = useContext(MixedAugmentation)

  const [note, setNote] = useState(initialTransactionGroup?.name ?? '')
  const [splitType, setSplitType] = useState(SplitTypeToString(initialTransactionGroup?.splitType ?? SplitType.EQUAL))
  const [category, setCategory] = useState(initialTransactionGroup?.category ?? null)
  const augmentedCategory = useMemo(() => categories.find((c) => c.id === category), [category, categories])
  const [currency, setCurrency] = useState(initialTransactionGroup?.currency ?? defaultCurrency.id)

  const [showErrorToast, setShowErrorToast] = useState('')
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

    onSubmit({
      name: note,
      splitType: ParseSplitType(splitType),
      currency: currency,
      category: category,
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting the transaction group')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} isValid={isFormValid} errorMessage={showErrorToast}>
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
    </FormWrapper>
  )
}

export default TransactionGroupForm
