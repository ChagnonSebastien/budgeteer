import { TextField } from '@mui/material'
import { FC } from 'react'
import styled from 'styled-components'

const FullWidthTextField = styled(TextField)`
  width: 100%;
`

const validAmount = new RegExp(`^\\d*[.,]?\\d*$`)
const NoError = ''

const validateNumber = (value: string) => {
  if (!value) {
    return 'Amount is required'
  }

  if (!validAmount.test(value)) {
    return 'Invalid amount. Enter a number'
  }

  return NoError
}

export interface NumberInputFieldState {
  value: string
  isValid: boolean
  hasVisited: boolean
  errorText: string
}

interface Props {
  value: NumberInputFieldState
  label: string

  setValue(updater: (prevState: NumberInputFieldState) => NumberInputFieldState): void
}

export const NumberInput: FC<Props> = (props) => {
  const { value, setValue, label } = props

  const classNameFromStatus = (status: NumberInputFieldState) => {
    return `${!status.isValid && 'ion-invalid'} ${status.hasVisited && 'ion-touched'}`
  }

  const onInput = (newValue: string) => {
    const sanitizedInput = `0${newValue.replace(',', '.')}`
    const textError = validateNumber(sanitizedInput)
    setValue((prevState) => ({
      ...prevState,
      isValid: textError === NoError,
      errorText: textError,
      value: newValue,
    }))
  }

  return (
    <FullWidthTextField
      type="text"
      label={label}
      variant="standard"
      value={value.value}
      className={`w-full ${classNameFromStatus(value)}`}
      onChange={(ev) => onInput(ev.target.value as string)}
      helperText={value.hasVisited ? value.errorText : ''}
      error={value.hasVisited && !!value.errorText}
      onBlur={() =>
        setValue((prevState) => ({
          ...prevState,
          hasVisited: true,
        }))
      }
      InputProps={{
        style: { appearance: 'textfield' },
      }}
      inputProps={{
        style: {
          MozAppearance: 'textfield',
          appearance: 'textfield',
          WebkitAppearance: 'none',
        },
        inputMode: 'decimal',
      }}
    />
  )
}
