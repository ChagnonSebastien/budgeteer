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

/** Caret index in `formatted` that sits just after the first `digitCount` digits. */
function caretAfterDigits(formatted: string, digitCount: number): number {
  if (digitCount <= 0) return 0
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (formatted[i] >= '0' && formatted[i] <= '9') {
      seen++
      if (seen === digitCount) return i + 1
    }
  }
  return formatted.length
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
 * Calculator-style amount input: the user only types digits and they fill in from
 * the right, with the decimal point placed according to the currency's decimals.
 * Typing 1, 2, 5, 6 with two decimals shows "0.01", "0.12", "1.25", "12.56".
 *
 * Editing in the middle keeps the caret where the user is working (it tracks the
 * number of digits to its left), rather than jumping to the end on every keystroke.
 */
export const FixedPointInput: FC<Props> = (props) => {
  const { value, onChange, decimalPoints, label, error, helperText, onBlur, autoFocus, sx } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)
  const display = formatScaled(value, decimalPoints)

  // After React re-renders with the reformatted value it would reset the caret to
  // the end; restore the position we computed during the edit instead.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current)
    }
    pendingCaret.current = null
  }, [display])

  const handleChange = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const raw = input.value
    const caretRaw = input.selectionStart ?? raw.length
    // How many digits sit to the left of the caret in the user's edited text.
    const digitsLeft = raw.slice(0, caretRaw).replace(/\D/g, '').length

    const digits = raw.replace(/\D/g, '').slice(0, MAX_DIGITS)
    const newValue = digits === '' ? 0 : parseInt(digits, 10)
    const formatted = formatScaled(newValue, decimalPoints)
    const caret = caretAfterDigits(formatted, digitsLeft)

    // Apply immediately (covers the case where the numeric value is unchanged and
    // React skips the re-render, so a non-digit keystroke can't linger) and
    // remember the position to reapply after the re-render.
    input.value = formatted
    input.setSelectionRange(caret, caret)
    pendingCaret.current = caret

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
        // A fresh (empty) amount starts at the end so digits append; an existing
        // amount respects where the user clicked so they can edit in place.
        if (value === 0) {
          const end = ev.target.value.length
          ev.target.setSelectionRange(end, end)
        }
      }}
      onBlur={onBlur}
      error={error}
      helperText={helperText}
      slotProps={{ htmlInput: { inputMode: 'numeric' } }}
    />
  )
}
