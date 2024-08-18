import { IonInput } from "@ionic/react"
import { FC } from "react"

const validAmount = new RegExp(`^\\d*[.,]?\\d*$`)
const NoError = "nil"

const validateNumber = (value: string) => {
  if (!value) {
    return "Amount is required"
  }

  if (!validAmount.test(value)) {
    return "Invalid amount. Enter a number"
  }

  return NoError
}

export interface NumberInputFieldState {
  value: string,
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

interface Props {
  value: NumberInputFieldState,

  setValue(updater: (prevState: NumberInputFieldState) => NumberInputFieldState): void,

  label: string
}

export const NumberInput: FC<Props> = (props) => {
  const {value, setValue, label} = props

  const classNameFromStatus = (status: NumberInputFieldState) => {
    return `${!status.isValid && "ion-invalid"} ${status.hasVisited && "ion-touched"}`
  }

  const onInput = (newValue: string) => {
    const sanitizedInput = `0${newValue.replace(",", ".")}`
    const textError = validateNumber(sanitizedInput)
    setValue(prevState => ({
      ...prevState,
      isValid: textError === NoError,
      errorText: textError,
      value: newValue,
    }))
  }

  return <IonInput type="text"
                   label={label}
                   labelPlacement="stacked"
                   value={value.value}
                   className={classNameFromStatus(value)}
                   onIonInput={ev => onInput(ev.target.value as string)}
                   errorText={value.errorText}
                   onIonBlur={() => setValue(prevState => ({
                     ...prevState,
                     hasVisited: true,
                   }))}
  />
}