import {
  IonButton,
  IonInput, IonText,
  IonToast,
} from "@ionic/react"
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Omit } from "react-router"
import Currency from "../domain/model/currency"
import { CurrencyServiceContext } from "../service/ServiceContext"

const validAmount = new RegExp(`^\\d+[.,]?$`)

interface Props {
  initialCurrency?: Currency,
  onSubmit: (data: Omit<Currency, "id">) => Promise<void>,
  submitText: string
}

interface FieldStatus {
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

const NoError = "nil"

const CurrencyForm: FC<Props> = (props) => {
  const {initialCurrency, onSubmit, submitText} = props

  const {state: currencies} = useContext(CurrencyServiceContext)

  const [name, setName] = useState(initialCurrency?.name ?? "")
  const [symbol, setSymbol] = useState(initialCurrency?.symbol ?? "")
  const [decimalPoints, setDecimalPoints] = useState(`${typeof initialCurrency === "undefined" ? "2" : initialCurrency.decimalPoints}`)

  const [showErrorToast, setShowErrorToast] = useState("")
  const [errors, setErrors] = useState<{accountName: FieldStatus, symbol: FieldStatus, decimalPoints: FieldStatus}>({
    accountName: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    symbol: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
    decimalPoints: {
      hasVisited: false,
      isValid: false,
      errorText: NoError,
    },
  })

  const formatExample = useMemo(() => {
    let shift = 0
    try {
      shift = parseInt(decimalPoints)
    } catch (e) {
    }

    if (shift > 100) {
      shift = 100
    }

    return `${(Math.floor(123.456789 * Math.pow(10, shift)) / Math.pow(10, shift)).toFixed(shift)}`

  }, [decimalPoints])

  const validateAccountName = useCallback((newName: string) => {
    if (!newName) {
      return "Required"
    }

    if (currencies?.find(a => a.id !== initialCurrency?.id && a.name === newName)) {
      return "Name is already being used"
    }

    return NoError
  }, [currencies])

  const validateSymbol = useCallback((newName: string) => {
    if (!newName) {
      return "Required"
    }

    return NoError
  }, [currencies])

  const validateDecimalPoints = useCallback((newName: string) => {
    if (!newName) {
      return "Required"
    }

    if (!validAmount.test(newName)) {
      return "Must be a integer value"
    }

    return NoError
  }, [])

  useEffect(() => {
    const accountNameError = validateAccountName(name)
    setErrors(prevState => ({
      ...prevState,
      accountName: {
        ...prevState.accountName,
        errorText: accountNameError,
        isValid: accountNameError == NoError,
      },
    }))
  }, [validateAccountName, name])

  useEffect(() => {
    const symbolError = validateSymbol(symbol)
    setErrors(prevState => ({
      ...prevState,
      symbol: {
        ...prevState.symbol,
        errorText: symbolError,
        isValid: symbolError == NoError,
      },
    }))
  }, [validateSymbol, symbol])

  useEffect(() => {
    const decimalPointsError = validateDecimalPoints(decimalPoints)
    setErrors(prevState => ({
      ...prevState,
      decimalPoints: {
        ...prevState.decimalPoints,
        errorText: decimalPointsError,
        isValid: decimalPointsError == NoError,
      },
    }))
  }, [validateDecimalPoints, decimalPoints])


  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()


    if (Object.values(errors).some(value => !value.isValid)) {
      setErrors(prevState => ({
        accountName: {
          ...prevState.accountName,
          hasVisited: true,
        },
        symbol: {
          ...prevState.symbol,
          hasVisited: true,
        },
        decimalPoints: {
          ...prevState.decimalPoints,
          hasVisited: true,
        },
      }))
      return
    }

    onSubmit({
      name,
      decimalPoints: parseInt(decimalPoints),
      symbol: symbol,
    }).catch(err => {
      setShowErrorToast("Unexpected error while creating the category")
      console.error(err)
    })
  }

  const classNameFromStatus = (status: FieldStatus) => {
    return `${!status.isValid && "ion-invalid"} ${status.hasVisited && "ion-touched"}`
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
      <div style={{display: "flex"}}>
        <div style={{color: "gray", margin: "0 1rem", transform: "translate(0, 0.5rem)"}}>Form</div>
        <div style={{borderBottom: "1px grey solid", flexGrow: 1}}/>
      </div>
      <div style={{padding: "1rem", border: "1px grey solid", borderTop: 0}}>
        <IonInput type="text"
                  className={classNameFromStatus(errors.accountName)}
                  label="Currency name"
                  labelPlacement="stacked"
                  placeholder="e.g., Canadian dollars"
                  value={name}
                  onIonInput={ev => setName(ev.target.value as string)}
                  errorText={errors.accountName.errorText}
                  onIonBlur={() => setErrors(prevState => ({
                    ...prevState,
                    accountName: {
                      ...prevState.accountName,
                      hasVisited: true,
                    },
                  }))}
        />

        <IonInput type="text"
                  className={classNameFromStatus(errors.symbol)}
                  label="Symbol"
                  labelPlacement="stacked"
                  placeholder="e.g., CAD"
                  value={symbol}
                  onIonInput={ev => setSymbol(ev.target.value as string)}
                  errorText={errors.symbol.errorText}
                  onIonBlur={() => setErrors(prevState => ({
                    ...prevState,
                    symbol: {
                      ...prevState.symbol,
                      hasVisited: true,
                    },
                  }))}
        />

        {typeof initialCurrency === "undefined" && (
          <>
            <IonInput type="text"
                      className={classNameFromStatus(errors.decimalPoints)}
                      label="Amount of decimal points"
                      labelPlacement="stacked"
                      value={decimalPoints}
                      onIonInput={ev => setDecimalPoints(ev.target.value as string)}
                      errorText={errors.decimalPoints.errorText}
                      onIonBlur={() => setErrors(prevState => ({
                        ...prevState,
                        decimalPoints: {
                          ...prevState.decimalPoints,
                          hasVisited: true,
                        },
                      }))}
            />

            <IonText color="warning">
              <div style={{
                transformOrigin: "left center",
                transform: "scale(0.75)",
                maxWidth: "calc(100% / 0.75)",
              }}>
                Warning: This value cannot be changed later
              </div>
            </IonText>
          </>
        )}
        <div style={{height: "1rem"}}/>

        <div style={{display: "flex"}}>
          <div style={{color: "gray", margin: "0 1rem", transform: "translate(0, 0.5rem)", fontSize: ".75rem"}}>
            Formatting example
          </div>
          <div style={{borderBottom: "1px grey solid", flexGrow: 1}}/>
        </div>
        <div style={{padding: "1rem", border: "1px grey solid", borderTop: 0, textAlign: "center"}}>
          {formatExample} {symbol}
        </div>

      </div>

      <div style={{height: "1rem"}}/>

      <IonButton type="submit" expand="block">
        {submitText}
      </IonButton>

      <IonToast isOpen={showErrorToast !== ""}
                message={showErrorToast}
                duration={5000}
                onDidDismiss={() => setShowErrorToast("")}/>
    </form>

  )
}

export default CurrencyForm
