import { Alert, AlertColor, Snackbar } from '@mui/material'
import { createContext, FC, ReactNode, useCallback, useContext, useMemo, useState } from 'react'

interface ToastContextValue {
  showToast: (message: string, severity?: AlertColor) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} })

export const useToast = () => useContext(ToastContext)

interface ToastState {
  message: string
  severity: AlertColor
}

/**
 * Mounts a single app-wide toast (Snackbar) above the router so messages survive
 * navigation — e.g. a success toast shown right before a form redirects. Consumers
 * call `useToast().showToast(message, severity)`; there is only ever one container.
 */
export const ToastProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [open, setOpen] = useState(false)

  const showToast = useCallback((message: string, severity: AlertColor = 'success') => {
    setToast({ message, severity })
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={(_event, reason) => {
          if (reason === 'clickaway') return
          setOpen(false)
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert onClose={() => setOpen(false)} severity={toast.severity} variant="filled" sx={{ width: '100%' }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  )
}
