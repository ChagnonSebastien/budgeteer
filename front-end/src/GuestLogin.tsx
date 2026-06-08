import { Alert, Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL + '/'

export function GuestLogin() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await fetch(BACKEND_URL + 'auth/guest/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, name }),
      })

      if (response.ok) {
        setMessage('Code sent! Check your email.')
        setStep('code')
      } else {
        const data = await response.text()
        setError(data || 'Failed to send code')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
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
    } catch (err) {
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
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        p: 2.5,
        bgcolor: 'background.default',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 400, width: '100%' }}>
        <Typography variant="h4" align="center" gutterBottom>
          Budgeteer
        </Typography>
        <Typography variant="h6" align="center" color="text.secondary" sx={{ fontWeight: 'normal', mb: 3 }}>
          Guest Login
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}

        {step === 'email' ? (
          <Box component="form" onSubmit={handleSendCode}>
            <Stack spacing={2}>
              <TextField
                id="name"
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                disabled={loading}
                fullWidth
              />
              <TextField
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? 'Sending...' : 'Send Login Code'}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleVerifyCode}>
            <Stack spacing={2}>
              <TextField
                id="code"
                label="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                disabled={loading}
                slotProps={{ htmlInput: { maxLength: 8 } }}
                autoFocus
                fullWidth
              />
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <Button type="button" variant="outlined" onClick={handleBackToEmail} disabled={loading} fullWidth>
                Back
              </Button>
            </Stack>
          </Box>
        )}

        <Divider sx={{ mt: 2.5, mb: 2 }} />
        <Typography variant="caption" component="p" align="center" color="text.secondary" sx={{ mb: 1 }}>
          A verification code will be sent to your email address.
        </Typography>
        <Typography variant="caption" component="p" align="center" color="text.secondary">
          Guest accounts have limited access to features.
        </Typography>
      </Paper>
    </Box>
  )
}
