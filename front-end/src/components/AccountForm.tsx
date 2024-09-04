import { IonButton, IonInput, IonToast } from '@ionic/react'
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Omit } from 'react-router'

import CurrencyPicker from './CurrencyPicker'
import { IconToolsContext } from './IconTools'
import { NumberInput, NumberInputFieldState } from './NumberInput'
import Account from '../domain/model/account'
import { AccountServiceContext, CurrencyServiceContext } from '../service/ServiceContext'

interface Props {
  initialAccount?: Account
  onSubmit: (data: Omit<Account, 'id'>) => Promise<void>
  submitText: string
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = 'nil'

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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    let hasErrors = Object.values(errors).some((value) => !value.isValid)
    if (!hasErrors) {
      for (const state of initialAmounts) {
        if (state.value.errorText !== NoError || state.currencyId === null) {
          hasErrors = true
          break
        }
      }
    }

    if (hasErrors) {
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
      initialAmounts: initialAmounts.map((ia) => ({
        currencyId: ia.currencyId!,
        value: Math.floor(parseFloat(`0${ia.value.value.replace(',', '.')}`) * 100),
      })),
      isMine,
      type: type.trim() === '' ? null : type.trim(),
      financialInstitution: financialInstitution.trim() === '' ? null : financialInstitution.trim(),
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
        <IonInput
          type="text"
          className={classNameFromStatus(errors.accountName)}
          label="Account name"
          labelPlacement="stacked"
          placeholder="e.g., Savings"
          value={name}
          onIonInput={(ev) => setName(ev.target.value as string)}
          errorText={errors.accountName.errorText}
          onIonBlur={() =>
            setErrors((prevState) => ({
              ...prevState,
              accountName: {
                ...prevState.accountName,
                hasVisited: true,
              },
            }))
          }
        />

        <IonInput
          type="text"
          label="Account Type"
          labelPlacement="stacked"
          placeholder="e.g., TFSA"
          value={type}
          errorText={NoError}
          onIonInput={(ev) => setType(ev.target.value as string)}
        />

        <IonInput
          type="text"
          label="Financial Institution"
          labelPlacement="stacked"
          placeholder="e.g., National Bank of Canada"
          value={financialInstitution}
          errorText={NoError}
          onIonInput={(ev) => setFinancialInstitution(ev.target.value as string)}
        />

        <div
          style={{
            transformOrigin: 'left center',
            transform: 'translateY(50%) scale(0.75)',
            maxWidth: 'calc(100% / 0.75)',
          }}
        >
          Starting balances
        </div>

        <div style={{ height: '1rem' }} />

        {initialAmounts.map((i) => (
          <div key={i.uid} style={{ display: 'flex', alignItems: 'start' }}>
            <Minus
              style={{ margin: '1rem 0', flexShrink: 0 }}
              size="1.5rem"
              onClick={() => setInitialAmount((prevState) => prevState.filter((state) => state.uid !== i.uid))}
            />

            <div style={{ width: '1rem', flexShrink: 0 }} />

            <CurrencyPicker
              errorText={NoError}
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
          </div>
        ))}

        {initialAmounts.length < currencies.length && (
          <Plus
            style={{ margin: '1rem 0', flexShrink: 0 }}
            size="1.5rem"
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
            Add initial amount
          </Plus>
        )}
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

export default AccountForm
