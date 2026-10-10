import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

import FormWrapper from './components/shared/FormWrapper'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || window.location.origin) + '/'

export function GuestLogin() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim() === '') {
      setError('Enter your email.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(BACKEND_URL + 'auth/guest/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setMessage('Code sent! Check your email.')
        setStep('code')
      } else {
        const data = await response.text()
        setError(data || 'Failed to send code')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim() === '') {
      setError('Enter the code from the email.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const response = await fetch(BACKEND_URL + 'auth/guest/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage('Login successful! Redirecting...')
        // Redirect to main app
        setTimeout(() => {
          window.location.href = '/'
        }, 1000)
      } else {
        setError(data.message || 'Invalid code')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToEmail = () => {
    setStep('email')
    setCode('')
    setError('')
    setMessage('')
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', p: 2, bgcolor: 'background.default' }}>
      <Stack spacing={2} sx={{ maxWidth: (t) => t.contentWidth.compact, width: '100%', m: 'auto' }}>
        <Typography variant="h5">Fintrospect guest login</Typography>
        <Typography color="text.secondary">
          We'll email you a verification code. Guest accounts can only see the groups they're invited to.
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}

        {step === 'email' ? (
          <FormWrapper onSubmit={handleSendCode} submitText="Send login code">
            <TextField
              id="email"
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              fullWidth
            />
          </FormWrapper>
        ) : (
          <>
            <FormWrapper onSubmit={handleVerifyCode} submitText="Verify and log in">
              <TextField
                id="code"
                label="Verification code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                disabled={loading}
                slotProps={{ htmlInput: { maxLength: 8 } }}
                autoFocus
                fullWidth
              />
            </FormWrapper>
            <Button color="inherit" onClick={handleBackToEmail} disabled={loading}>
              Use a different email
            </Button>
          </>
        )}
      </Stack>
    </Box>
  )
}
