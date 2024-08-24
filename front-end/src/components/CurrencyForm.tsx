import {
  IonButton, IonDatetime, IonDatetimeButton,
  IonInput, IonModal, IonText,
  IonToast,
} from "@ionic/react"
import { FC, FormEvent, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { Omit } from "react-router"
import { UserContext } from "../App"
import Currency, { ExchangeRate } from "../domain/model/currency"
import { CurrencyServiceContext } from "../service/ServiceContext"
import { formatDateTime } from "../store/remote/converter/transactionConverter"

const validAmount = new RegExp(`^\\d+[.,]?$`)
const validRate = new RegExp(`^\\d*[.,]?\\d*$`)

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

  const {state: currencies, defaultCurrency} = useContext(CurrencyServiceContext)
  const {default_currency: defaultCurrencyId} = useContext(UserContext)

  const [name, setName] = useState(initialCurrency?.name ?? "")
  const [symbol, setSymbol] = useState(initialCurrency?.symbol ?? "")
  const [decimalPoints, setDecimalPoints] = useState(`${typeof initialCurrency === "undefined" ? "2" : initialCurrency.decimalPoints}`)
  const [initialExchangeRate, setInitialExchangeRate] = useState("1")
  const [initialExchangeRateDate, setinitialExchangeRateDate] = useState(new Date())

  const [showDateModal, setShowDateModal] = useState(false)

  const showExchangeRate = useMemo(() => {
    return typeof initialCurrency === "undefined" && typeof defaultCurrency !== "undefined"
  }, [currencies])

  const [showErrorToast, setShowErrorToast] = useState("")
  const [errors, setErrors] = useState<{
    accountName: FieldStatus,
    symbol: FieldStatus,
    decimalPoints: FieldStatus,
    exchangeRate: FieldStatus
  }>({
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
    exchangeRate: {
      hasVisited: false,
      isValid: !showExchangeRate,
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

  const validateExchangeRate = useCallback((newName: string) => {
    if (!newName) {
      return "Required"
    }

    if (!validRate.test(newName)) {
      return "Must be a valid rate"
    }

    if (parseFloat(newName) === 0) {
      return "Rate must be above 0"
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

  useEffect(() => {
    const exchangeRateError = validateExchangeRate(initialExchangeRate)
    setErrors(prevState => ({
      ...prevState,
      exchangeRate: {
        ...prevState.exchangeRate,
        errorText: exchangeRateError,
        isValid: exchangeRateError == NoError,
      },
    }))
  }, [validateExchangeRate, initialExchangeRate])


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
        exchangeRate: {
          ...prevState.exchangeRate,
          hasVisited: true,
        },
      }))
      return
    }

    onSubmit({
      name,
      decimalPoints: parseInt(decimalPoints),
      symbol: symbol,
      exchangeRates: showExchangeRate
        ? {
          [defaultCurrency!.id]: [
            new ExchangeRate(0, parseFloat(initialExchangeRate), formatDateTime(initialExchangeRateDate)),
          ],
        }
        : {},
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


        {showExchangeRate && (
          <>
            <div style={{height: "1rem"}}/>
            <div style={{color: "grey"}}>
              Exchange Rates
            </div>
            <div style={{display: "flex", alignItems: "stretch"}}>
              <div style={{display: "flex", alignItems: "center", flexShrink: 0}}>
                {`1 ${symbol === "" ? "___" : symbol}`}
              </div>
              <div style={{margin: "0 1rem", display: "flex", alignItems: "center", flexShrink: 0}}>=</div>
              <IonInput type="text"
                        className={classNameFromStatus(errors.exchangeRate)}
                        value={initialExchangeRate}
                        onIonInput={ev => setInitialExchangeRate(ev.target.value as string)}
                        errorText={errors.exchangeRate.errorText}
                        onIonBlur={() => setErrors(prevState => ({
                          ...prevState,
                          exchangeRate: {
                            ...prevState.exchangeRate,
                            hasVisited: true,
                          },
                        }))}
              />
              <div style={{margin: "0 1rem", display: "flex", alignItems: "center", flexShrink: 0}}>
                {defaultCurrency!.symbol} on
              </div>
              <div style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                borderBottom: "1px rgba(0, 0, 0, 0.13) solid",
                marginBottom: "5px",
              }}>
                <IonDatetimeButton onClick={() => setShowDateModal(true)} datetime="datetime"></IonDatetimeButton>

                <IonModal keepContentsMounted={true} isOpen={showDateModal}>
                  <IonDatetime id="datetime" presentation="date" onIonChange={ev => {
                    const newDate = new Date(Date.parse(ev.detail.value as string))
                    setinitialExchangeRateDate(newDate)
                    if (newDate.getFullYear() === initialExchangeRateDate.getFullYear() && newDate.getMonth() === initialExchangeRateDate.getMonth()) {
                      setShowDateModal(false)
                    }
                  }}/>
                </IonModal>
              </div>
            </div>
          </>
        )}

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
