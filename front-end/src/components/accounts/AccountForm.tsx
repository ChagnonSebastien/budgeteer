import { TextField, Typography } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'

import Account, { Balance } from '../../domain/model/account'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CurrencyPicker from '../currencies/CurrencyPicker'
import { IconToolsContext } from '../icons/IconTools'
import { NumberInput, NumberInputFieldState } from '../inputs/NumberInput'
import FormWrapper from '../shared/FormWrapper'
import { Row } from '../shared/NoteContainer'

const IconButton = styled.div`
  margin: 1rem 0;
  flex-shrink: 0;
  cursor: pointer;
`

interface Props {
  initialAccount?: Account
  onSubmit: (data: Partial<Omit<Account, 'id' | 'hasName'>>) => Promise<void>
  submitText: string
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = ''

const AccountForm: FC<Props> = (props) => {
  const { initialAccount, onSubmit, submitText } = props

  const { state: accounts } = useContext(AccountServiceContext)
  const { state: currencies } = useContext(CurrencyServiceContext)
  const { iconTypeFromName } = useContext(IconToolsContext)
  const Plus = useMemo(() => iconTypeFromName('BsPlusCircle'), [iconTypeFromName])
  const Minus = useMemo(() => iconTypeFromName('BsDashCircle'), [iconTypeFromName])

  const [isMine] = useState(initialAccount?.isMine ?? true)
  const [name, setName] = useState(initialAccount?.name ?? '')
  const [type, setType] = useState(initialAccount?.type ?? '')
  const [financialInstitution, setFinancialInstitution] = useState(initialAccount?.financialInstitution ?? '')
  const [initialAmounts, setInitialAmount] = useState<
    {
      uid: number
      currencyId: number | null
      value: NumberInputFieldState
    }[]
  >(
    initialAccount?.initialAmounts.map((balance) => ({
      uid: Math.random(),
      currencyId: balance.currencyId,
      value: {
        value: `${balance.value / 100}`,
        isValid: false,
        hasVisited: false,
        errorText: NoError,
      },
    })) ?? [],
  )

  const availableCurrencies = useMemo(() => {
    return currencies.filter((cur) => initialAmounts.findIndex((ia) => ia.currencyId === cur.id) === -1)
  }, [currencies, initialAmounts])

  const [showErrorToast, setShowErrorToast] = useState('')
  const [errors, setErrors] = useState<{ accountName: FieldStatus }>({
    accountName: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
  })

  const validateAccountName = useCallback(
    (newName: string) => {
      if (!newName) {
        return 'Amount is required'
      }

      if (accounts?.find((a) => a.id !== initialAccount?.id && a.name === newName)) {
        return 'Name is already being used'
      }

      return NoError
    },
    [accounts],
  )

  useEffect(() => {
    const accountNameError = validateAccountName(name)
    setErrors((prevState) => ({
      accountName: {
        ...prevState.accountName,
        errorText: accountNameError,
        isValid: accountNameError == NoError,
      },
    }))
  }, [validateAccountName, name])

  const isFormValid = useMemo(() => {
    let valid = Object.values(errors).every((value) => value.isValid)
    if (valid) {
      for (const state of initialAmounts) {
        if (state.value.errorText !== NoError || state.currencyId === null) {
          valid = false
          break
        }
      }
    }
    return valid
  }, [errors, initialAmounts])

  const handleSubmit = (_e: FormEvent<HTMLFormElement>) => {
    if (!isFormValid) {
      setErrors((prevState) => ({
        accountName: {
          ...prevState.accountName,
          hasVisited: true,
        },
      }))
      setInitialAmount((prevState) =>
        prevState.map((ps) => ({
          ...ps,
          value: {
            ...ps.value,
            hasVisited: true,
          },
        })),
      )
      return
    }

    onSubmit({
      name,
      initialAmounts: initialAmounts.map(
        (ia) => new Balance(ia.currencyId!, Math.floor(parseFloat(`0${ia.value.value.replace(',', '.')}`) * 100)),
      ),
      isMine,
      type: type.trim(),
      financialInstitution: financialInstitution.trim(),
    }).catch((err) => {
      setShowErrorToast('Unexpected error while submitting')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText} isValid={isFormValid} errorMessage={showErrorToast}>
      <TextField
        type="text"
        className="w-full"
        label="Account name"
        variant="standard"
        placeholder="e.g., Savings"
        value={name}
        onChange={(ev) => setName(ev.target.value as string)}
        helperText={errors.accountName.hasVisited ? errors.accountName.errorText : ''}
        error={errors.accountName.hasVisited && !!errors.accountName.errorText}
        onBlur={() =>
          setErrors((prevState) => ({
            ...prevState,
            accountName: {
              ...prevState.accountName,
              hasVisited: true,
            },
          }))
        }
      />

      <TextField
        type="text"
        className="w-full"
        label="Account Type"
        variant="standard"
        placeholder="e.g., TFSA"
        value={type}
        helperText={NoError}
        onChange={(ev) => setType(ev.target.value as string)}
      />

      <TextField
        type="text"
        className="w-full"
        label="Financial Institution"
        variant="standard"
        placeholder="e.g., National Bank of Canada"
        value={financialInstitution}
        helperText={NoError}
        onChange={(ev) => setFinancialInstitution(ev.target.value as string)}
      />

      <div>
        <Typography color="textSecondary" className="origin-left scale-75" style={{ maxWidth: 'calc(100% / 0.75)' }}>
          Starting balances
        </Typography>

        <div style={{ height: '1rem' }} />

        {initialAmounts.map((i) => (
          <Row key={i.uid} style={{ alignItems: 'start' }}>
            <IconButton
              onClick={() => setInitialAmount((prevState) => prevState.filter((state) => state.uid !== i.uid))}
            >
              <Minus className="text-2xl" />
            </IconButton>

            <div style={{ width: '1rem', flexShrink: 0 }} />

            <CurrencyPicker
              errorText={NoError}
              style={{ width: '100%' }}
              currencies={[
                ...(i.currencyId ? [currencies.find((c) => c.id === i.currencyId)!] : []),
                ...availableCurrencies,
              ]}
              selectedCurrencyId={i.currencyId}
              setSelectedCurrencyId={(selected) => {
                setInitialAmount((prevState) => {
                  return prevState.map((ia) => {
                    if (ia.uid !== i.uid) return ia

                    return {
                      ...ia,
                      currencyId: selected,
                    }
                  })
                })
              }}
              labelText="Currency"
            />

            <div style={{ width: '1rem', flexShrink: 0 }} />

            <NumberInput
              label="Initial balance"
              key={i.uid}
              value={i.value}
              setValue={(updater) =>
                setInitialAmount((prevState) => {
                  return prevState.map((ia) => {
                    if (ia.uid !== i.uid) return ia

                    return {
                      ...ia,
                      value: updater(ia.value),
                    }
                  })
                })
              }
            />
          </Row>
        ))}

        {initialAmounts.length < currencies.length && (
          <IconButton
            onClick={() =>
              setInitialAmount((prevState) => [
                ...prevState,
                {
                  uid: Math.random(),
                  currencyId: availableCurrencies[0].id,
                  value: {
                    value: '',
                    errorText: 'Amount is required',
                    hasVisited: false,
                    isValid: false,
                  },
                },
              ])
            }
          >
            <Plus className="text-2xl" />
          </IconButton>
        )}
      </div>
    </FormWrapper>
  )
}

export default AccountForm
