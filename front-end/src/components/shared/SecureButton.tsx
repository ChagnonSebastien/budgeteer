import { Button, ButtonProps, CircularProgress } from '@mui/material'
import { FC, MouseEvent, ReactNode, useState } from 'react'

interface Props extends Omit<ButtonProps, 'onClick'> {
  /** Shows a spinner and disables the button. Use for work tracked by a parent (e.g. form submit). */
  loading?: boolean
  /**
   * Click handler. If it returns a promise, the button shows a spinner and blocks
   * further clicks until the promise settles — preventing accidental double submits.
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<void>
  children: ReactNode
}

/**
 * A Button that cannot be triggered twice while its work is in flight: it disables
 * itself and shows a spinning indicator both for parent-tracked work (`loading`) and
 * for self-managed async `onClick` handlers.
 */
export const SecureButton: FC<Props> = (props) => {
  const { loading = false, disabled, onClick, children, startIcon, ...rest } = props
  const [pending, setPending] = useState(false)
  const busy = loading || pending

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (busy || !onClick) return
    const result = onClick(e)
    if (result instanceof Promise) {
      setPending(true)
      result.then(
        () => setPending(false),
        () => setPending(false),
      )
    }
  }

  return (
    <Button
      {...rest}
      disabled={disabled || busy}
      onClick={onClick ? handleClick : undefined}
      startIcon={busy ? <CircularProgress size="1.1rem" color="inherit" /> : startIcon}
    >
      {children}
    </Button>
  )
}
