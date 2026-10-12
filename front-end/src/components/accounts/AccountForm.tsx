import { Button, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import Account, { Balance } from '../../domain/model/account'
import { AccountServiceContext, CurrencyServiceContext } from '../../service/ServiceContext'
import CurrencyPicker from '../currencies/CurrencyPicker'
import { IconToolsContext } from '../icons/IconTools'
import { FixedPointInput } from '../inputs/FixedPointInput'
import FormWrapper, { FormSection } from '../shared/FormWrapper'
import { useToast } from '../shared/ToastProvider'

const IconButton = styled('div')({ display: 'flex', flexShrink: 0, cursor: 'pointer' })

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
  const { state: currencies, tentativeDefaultCurrency } = useContext(CurrencyServiceContext)
  const { IconLib } = useContext(IconToolsContext)

  const [isMine] = useState(initialAccount?.isMine ?? true)
  const [name, setName] = useState(initialAccount?.name ?? '')
  const [type, setType] = useState(initialAccount?.type ?? '')
  const [financialInstitution, setFinancialInstitution] = useState(initialAccount?.financialInstitution ?? '')
  const [isDebt, setIsDebt] = useState(initialAccount?.isDebt ?? false)
  const [initialAmounts, setInitialAmount] = useState<
    {
      uid: number
      currencyId: number | null
      value: number
      owed: boolean
    }[]
  >(
    initialAccount?.initialAmounts.map((balance) => ({
      uid: Math.random(),
      currencyId: balance.currencyId,
      value: Math.abs(balance.value),
      owed: balance.value < 0,
    })) ??
      (tentativeDefaultCurrency
        ? [{ uid: Math.random(), currencyId: tentativeDefaultCurrency.id, value: 0, owed: false }]
        : []),
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
        return 'Required'
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
        if (state.currencyId === null) {
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
      return
    }

    return onSubmit({
      name,
      initialAmounts: initialAmounts
        .filter((ia) => ia.value !== 0)
        .map((ia) => new Balance(ia.currencyId!, ia.owed ? -ia.value : ia.value)),
      isMine,
      type: type.trim(),
      financialInstitution: financialInstitution.trim(),
      isDebt,
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
        placeholder="e.g., Everyday chequing"
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
        placeholder="e.g., Chequing, Credit card, Cash"
        value={type}
        helperText={NoError}
        onChange={(ev) => setType(ev.target.value as string)}
      />

      <TextField
        type="text"
        label="Financial Institution"
        variant="standard"
        placeholder="e.g., Desjardins, RBC, Wealthsimple"
        value={financialInstitution}
        helperText={NoError}
        onChange={(ev) => setFinancialInstitution(ev.target.value as string)}
      />

      {isMine && (
        <FormSection title="Account kind">
          <ToggleButtonGroup
            exclusive
            size="small"
            fullWidth
            value={isDebt ? 'owe' : 'have'}
            onChange={(_, side: 'have' | 'owe' | null) => {
              if (side === null) return
              setIsDebt(side === 'owe')
              setInitialAmount((prevState) =>
                prevState.map((ia) => (ia.value === 0 ? { ...ia, owed: side === 'owe' } : ia)),
              )
            }}
          >
            <ToggleButton value="have">Money I have</ToggleButton>
            <ToggleButton value="owe">Money I owe</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" color="textSecondary">
            Credit cards, loans and lines of credit are money you owe. Costs Analysis shows spending they fund as
            borrowed.
          </Typography>
        </FormSection>
      )}

      <FormSection title="Starting balance">
        <Typography variant="body2" color="textSecondary">
          How much is in this account right now. If you plan to record past transactions, enter the balance from before
          the first one instead. You can change it later.
        </Typography>

        <Stack spacing={2}>
          {initialAmounts.map((i) => {
            const currency = currencies.find((c) => c.id === i.currencyId)
            return (
              <Stack key={i.uid} direction="row" alignItems="center" useFlexGap spacing={2} flexWrap="wrap">
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={i.owed ? 'owe' : 'have'}
                  onChange={(_, side: 'have' | 'owe' | null) =>
                    side !== null &&
                    setInitialAmount((prevState) =>
                      prevState.map((ia) => (ia.uid === i.uid ? { ...ia, owed: side === 'owe' } : ia)),
                    )
                  }
                >
                  <ToggleButton value="have">I have</ToggleButton>
                  <Tooltip title="A credit card balance or a loan">
                    <ToggleButton value="owe">I owe</ToggleButton>
                  </Tooltip>
                </ToggleButtonGroup>

                {currencies.length > 1 && (
                  <CurrencyPicker
                    errorText={NoError}
                    sx={{ flex: '1 1 10rem' }}
                    currencies={[...(currency ? [currency] : []), ...availableCurrencies]}
                    selectedCurrencyId={i.currencyId}
                    setSelectedCurrencyId={(selected) =>
                      setInitialAmount((prevState) =>
                        prevState.map((ia) => (ia.uid === i.uid ? { ...ia, currencyId: selected } : ia)),
                      )
                    }
                    labelText="Asset"
                  />
                )}

                <FixedPointInput
                  sx={{ flex: '1 1 10rem' }}
                  label={currencies.length > 1 ? 'Amount' : `Amount (${currency?.symbol ?? ''})`}
                  value={i.value}
                  onChange={(value) =>
                    setInitialAmount((prevState) => prevState.map((ia) => (ia.uid === i.uid ? { ...ia, value } : ia)))
                  }
                  decimalPoints={currency?.decimalPoints ?? 2}
                />

                <IconButton
                  aria-label="remove starting balance"
                  onClick={() => setInitialAmount((prevState) => prevState.filter((state) => state.uid !== i.uid))}
                >
                  <IconLib.BsDashCircle size="1.25rem" />
                </IconButton>
              </Stack>
            )
          })}
        </Stack>

        {availableCurrencies.length > 0 && (
          <Button
            size="small"
            startIcon={<IconLib.BsPlusCircle />}
            sx={{ alignSelf: 'flex-start' }}
            onClick={() =>
              setInitialAmount((prevState) => [
                ...prevState,
                { uid: Math.random(), currencyId: availableCurrencies[0].id, value: 0, owed: false },
              ])
            }
          >
            {initialAmounts.length === 0 ? 'Add a starting balance' : 'Add a balance in another asset'}
          </Button>
        )}
      </FormSection>
    </FormWrapper>
  )
}

export default AccountForm
