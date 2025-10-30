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
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        backgroundColor: '#f0f0f0',
      }}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          maxWidth: '400px',
          width: '100%',
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', textAlign: 'center' }}>Budgeteer</h1>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '18px', fontWeight: 'normal', textAlign: 'center' }}>
          Guest Login
        </h2>

        {error && (
          <div
            style={{
              backgroundColor: '#fee',
              color: '#c33',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}
        {message && (
          <div
            style={{
              backgroundColor: '#efe',
              color: '#3c3',
              padding: '12px',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            {message}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleSendCode}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="name" style={{ display: 'block', marginBottom: '4px' }}>
                Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="email" style={{ display: 'block', marginBottom: '4px' }}>
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Login Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div style={{ marginBottom: '16px' }}>
              <label htmlFor="code" style={{ display: 'block', marginBottom: '4px' }}>
                Verification Code
              </label>
              <input
                type="text"
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                disabled={loading}
                maxLength={8}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginBottom: '8px',
              }}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <button
              type="button"
              onClick={handleBackToEmail}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: 'white',
                color: '#007bff',
                border: '1px solid #007bff',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </form>
        )}

        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid #e0e0e0' }}>
          <p style={{ margin: '8px 0', fontSize: '13px', color: '#666', textAlign: 'center' }}>
            A verification code will be sent to your email address.
          </p>
          <p style={{ margin: '8px 0', fontSize: '13px', color: '#666', textAlign: 'center' }}>
            Guest accounts have limited access to features.
          </p>
        </div>
      </div>
    </div>
  )
}
