import { TextField } from '@mui/material'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { default as styled } from 'styled-components'

import Account, { Balance } from '../../domain/model/account'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CurrencyPicker from '../currencies/CurrencyPicker'
import { IconToolsContext } from '../icons/IconTools'
import { FixedPointInput } from '../inputs/FixedPointInput'
import FormWrapper from '../shared/FormWrapper'
import { Row, TinyHeader } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

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
  const { IconLib } = useContext(IconToolsContext)

  const [isMine] = useState(initialAccount?.isMine ?? true)
  const [name, setName] = useState(initialAccount?.name ?? '')
  const [type, setType] = useState(initialAccount?.type ?? '')
  const [financialInstitution, setFinancialInstitution] = useState(initialAccount?.financialInstitution ?? '')
  const [initialAmounts, setInitialAmount] = useState<
    {
      uid: number
      currencyId: number | null
      value: number
      hasVisited: boolean
    }[]
  >(
    initialAccount?.initialAmounts.map((balance) => ({
      uid: Math.random(),
      currencyId: balance.currencyId,
      value: balance.value,
      hasVisited: false,
    })) ?? [],
  )

  const availableCurrencies = useMemo(() => {
    return currencies.filter((cur) => initialAmounts.findIndex((ia) => ia.currencyId === cur.id) === -1)
  }, [currencies, initialAmounts])

  const { showToast } = useToast()
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
        if (state.currencyId === null || state.value === 0) {
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
          hasVisited: true,
        })),
      )
      return
    }

    return onSubmit({
      name,
      initialAmounts: initialAmounts.map((ia) => new Balance(ia.currencyId!, ia.value)),
      isMine,
      type: type.trim(),
      financialInstitution: financialInstitution.trim(),
    }).catch((err) => {
      showToast('Unexpected error while submitting the account', 'error')
      console.error(err)
    })
  }

  return (
    <FormWrapper onSubmit={handleSubmit} submitText={submitText}>
      <TextField
        type="text"
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
        label="Account Type"
        variant="standard"
        placeholder="e.g., TFSA"
        value={type}
        helperText={NoError}
        onChange={(ev) => setType(ev.target.value as string)}
      />

      <TextField
        type="text"
        label="Financial Institution"
        variant="standard"
        placeholder="e.g., National Bank of Canada"
        value={financialInstitution}
        helperText={NoError}
        onChange={(ev) => setFinancialInstitution(ev.target.value as string)}
      />

      <div>
        <TinyHeader>Starting balances</TinyHeader>

        <div style={{ height: '1rem' }} />

        {initialAmounts.map((i) => (
          <Row key={i.uid} style={{ alignItems: 'start', gap: '1rem' }}>
            <IconButton
              onClick={() => setInitialAmount((prevState) => prevState.filter((state) => state.uid !== i.uid))}
            >
              <IconLib.BsDashCircle size="1.25rem" />
            </IconButton>

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

            <FixedPointInput
              sx={{ width: '100%' }}
              label="Initial balance"
              value={i.value}
              onChange={(value) =>
                setInitialAmount((prevState) => prevState.map((ia) => (ia.uid === i.uid ? { ...ia, value } : ia)))
              }
              decimalPoints={currencies.find((c) => c.id === i.currencyId)?.decimalPoints ?? 2}
              error={i.hasVisited && i.value === 0}
              helperText={i.hasVisited && i.value === 0 ? 'Amount is required' : NoError}
              onBlur={() =>
                setInitialAmount((prevState) =>
                  prevState.map((ia) => (ia.uid === i.uid ? { ...ia, hasVisited: true } : ia)),
                )
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
                  value: 0,
                  hasVisited: false,
                },
              ])
            }
          >
            <IconLib.BsPlusCircle size="1.25rem" />
          </IconButton>
        )}
      </div>
    </FormWrapper>
  )
}

export default AccountForm
