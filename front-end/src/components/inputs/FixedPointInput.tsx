import { SxProps, TextField, Theme } from '@mui/material'
import { FC, useLayoutEffect, useRef } from 'react'

const MAX_DIGITS = 15

/**
 * Formats a scaled integer (e.g. 1256) into its fixed-point representation for a
 * given number of decimals (e.g. 2 -> "12.56"), respecting the user's locale.
 */
function formatScaled(value: number, decimalPoints: number): string {
  return (value / Math.pow(10, decimalPoints)).toLocaleString(undefined, {
    minimumFractionDigits: decimalPoints,
    maximumFractionDigits: decimalPoints,
  })
}

interface Props {
  /** The amount as a scaled integer in the smallest unit (value = displayed * 10^decimalPoints). */
  value: number
  onChange: (value: number) => void
  /** Number of decimals the currency uses; the decimal point is placed automatically. */
  decimalPoints: number
  label?: string
  error?: boolean
  helperText?: string
  onBlur?: () => void
  autoFocus?: boolean
  sx?: SxProps<Theme>
}

/**
 * Calculator-style amount input: the user only ever types digits and they fill in
 * from the right, with the decimal point placed according to the currency's decimals.
 * Typing 1, 2, 5, 6 with two decimals shows "0.01", "0.12", "1.25", "12.56".
 */
export const FixedPointInput: FC<Props> = (props) => {
  const { value, onChange, decimalPoints, label, error, helperText, onBlur, autoFocus, sx } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const display = formatScaled(value, decimalPoints)

  // Keep the caret at the end so digits always append (and backspace removes the
  // last one), regardless of where the field was clicked.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && document.activeElement === input) {
      const end = input.value.length
      input.setSelectionRange(end, end)
    }
  }, [display])

  const handleChange = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const digits = input.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
    const newValue = digits === '' ? 0 : parseInt(digits, 10)

    // Normalize the DOM value (and caret) immediately. When newValue === value
    // React skips the re-render, so without this a stray keystroke — a non-digit
    // or extra leading zero — would linger in the field.
    const normalized = formatScaled(newValue, decimalPoints)
    input.value = normalized
    input.setSelectionRange(normalized.length, normalized.length)

    onChange(newValue)
  }

  return (
    <TextField
      inputRef={inputRef}
      sx={sx}
      label={label}
      variant="standard"
      autoFocus={autoFocus}
      value={display}
      onChange={(ev) => handleChange(ev.target)}
      onFocus={(ev) => {
        const end = ev.target.value.length
        ev.target.setSelectionRange(end, end)
      }}
      onBlur={onBlur}
      error={error}
      helperText={helperText}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
    />
  )
}
