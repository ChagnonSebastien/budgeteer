import { SxProps, TextField, Theme } from '@mui/material'
import { FC, useLayoutEffect, useRef, useState } from 'react'

const MAX_DIGITS = 15

/** Keys that mean "I want to type the fractional part now". */
const SEPARATOR_KEYS = ['.', ',', 'Decimal']

/** The locale's decimal separator (e.g. "." for en-US, "," for fr-CA). */
const DECIMAL_SEPARATOR = ((): string => {
  try {
    const part = new Intl.NumberFormat(undefined).formatToParts(1.1).find((p) => p.type === 'decimal')
    return part?.value ?? '.'
  } catch {
    return '.'
  }
})()

const isDigit = (ch: string) => ch >= '0' && ch <= '9'

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

/** Number of digit characters to the right of `caret` in `str`. */
function digitsRightOf(str: string, caret: number): number {
  let n = 0
  for (let i = caret; i < str.length; i++) if (isDigit(str[i])) n++
  return n
}

/**
 * Caret index in `str` that leaves exactly `count` digits to its right. Counting from
 * the right keeps the caret stable across reformatting even as the leading "0" pad
 * appears/disappears (which is what breaks left-counting for values below 1).
 */
function caretLeavingDigitsRight(str: string, count: number): number {
  if (count <= 0) return str.length
  let seen = 0
  for (let i = str.length - 1; i >= 0; i--) {
    if (isDigit(str[i])) {
      seen++
      if (seen === count) return i
    }
  }
  return 0
}

/** Keeps only digits and at most one decimal separator from free-typed text. */
function sanitize(input: string): string {
  let seenSeparator = false
  let out = ''
  for (const ch of input) {
    if (isDigit(ch)) {
      out += ch
    } else if (ch === DECIMAL_SEPARATOR && !seenSeparator) {
      out += ch
      seenSeparator = true
    }
  }
  return out
}

/**
 * Parses a literal draft (digits + at most one separator) into a scaled integer.
 * "12.3" with 2 decimals -> 1230; the fraction is padded/truncated to the currency's decimals.
 */
function parseLiteral(input: string, decimalPoints: number): number {
  const separatorIndex = input.indexOf(DECIMAL_SEPARATOR)
  if (separatorIndex === -1) {
    const digits = input.replace(/\D/g, '').slice(0, MAX_DIGITS)
    return digits === '' ? 0 : parseInt(digits, 10)
  }

  const intDigits = input.slice(0, separatorIndex).replace(/\D/g, '')
  const fracDigits = input
    .slice(separatorIndex + 1)
    .replace(/\D/g, '')
    .slice(0, decimalPoints)
    .padEnd(decimalPoints, '0')
  const combined = (intDigits + fracDigits).slice(0, MAX_DIGITS)
  return combined === '' ? 0 : parseInt(combined, 10)
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
 * Amount input with two entry styles that converge on the same value:
 *
 *  - By default it is calculator style: you type digits and they fill in from the right,
 *    reformatting live ("1", "12", "123" -> "0.01", "0.12", "1.23"). Editing in the middle
 *    works -- the caret tracks the number of digits to its right, so backspace/delete/insert
 *    land where expected even as the leading "0" pad comes and goes.
 *  - Pressing the decimal key switches (for the rest of that focus) to literal entry: the
 *    digits typed so far become the integer part and you type the fraction ("12" "." "3").
 *
 * Both "1230" and "12.3" yield "12.30" at two decimals.
 */
export const FixedPointInput: FC<Props> = (props) => {
  const { value, onChange, decimalPoints, label, error, helperText, onBlur, autoFocus, sx } = props

  // While `literal`, the field shows `draft` (raw text); otherwise it shows the live
  // formatted value. Both reset on focus so each editing session starts in calculator mode.
  const [literal, setLiteral] = useState(false)
  const [draft, setDraft] = useState('')
  const display = literal ? draft : formatScaled(value, decimalPoints)

  const inputRef = useRef<HTMLInputElement>(null)
  const pendingCaret = useRef<number | null>(null)

  // After React re-renders the reformatted value it would push the caret to the end;
  // restore the position we computed during the edit instead.
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current)
    }
    pendingCaret.current = null
  }, [display])

  const handleCalcChange = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const digitsRight = digitsRightOf(input.value, input.selectionStart ?? input.value.length)
    const digits = input.value.replace(/\D/g, '').slice(0, MAX_DIGITS)
    const newValue = digits === '' ? 0 : parseInt(digits, 10)
    const formatted = formatScaled(newValue, decimalPoints)
    const caret = caretLeavingDigitsRight(formatted, digitsRight)

    // Apply immediately (covers the case where the numeric value is unchanged, so React
    // skips the re-render) and remember the caret to reapply after the re-render.
    input.value = formatted
    input.setSelectionRange(caret, caret)
    pendingCaret.current = caret

    onChange(newValue)
  }

  const handleLiteralChange = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const next = sanitize(input.value)
    setDraft(next)
    onChange(parseLiteral(next, decimalPoints))
  }

  return (
    <TextField
      inputRef={inputRef}
      sx={sx}
      label={label}
      variant="standard"
      autoFocus={autoFocus}
      value={display}
      onKeyDown={(ev) => {
        if (literal || !SEPARATOR_KEYS.includes(ev.key)) return
        // Switch to literal entry: the digits typed so far are the integer part.
        ev.preventDefault()
        const next = `${value}${DECIMAL_SEPARATOR}`
        pendingCaret.current = next.length
        setLiteral(true)
        setDraft(next)
        onChange(parseLiteral(next, decimalPoints))
      }}
      onChange={(ev) => (literal ? handleLiteralChange(ev.target) : handleCalcChange(ev.target))}
      onFocus={(ev) => {
        setLiteral(false)
        setDraft('')
        const end = ev.target.value.length
        ev.target.setSelectionRange(end, end)
      }}
      onBlur={() => {
        setLiteral(false)
        setDraft('')
        onBlur?.()
      }}
      error={error}
      helperText={helperText}
      slotProps={{ htmlInput: { inputMode: 'decimal' } }}
    />
  )
}
