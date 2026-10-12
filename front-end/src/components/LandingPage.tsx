import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { FC } from 'react'

import { SecureButton } from './shared/SecureButton'

interface Props {
  oidcLogin: (() => void) | null
  userPassLogin: (() => void) | null
  guestLogin: (() => void) | null
  demoLogin: () => Promise<void>
}

const LandingPage: FC<Props> = ({ oidcLogin, userPassLogin, guestLogin, demoLogin }) => (
  <Box sx={{ display: 'flex', minHeight: '100vh', px: 2, py: 4 }}>
    <Stack spacing={4} useFlexGap sx={{ m: 'auto', width: '100%', maxWidth: (t) => t.contentWidth.dialog }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Box component="img" src="/icon.svg" alt="" sx={{ width: 40, height: 40 }} />
        <Typography variant="h6">Fintrospect</Typography>
      </Stack>

      <Paper
        variant="outlined"
        sx={(t) => ({
          p: { xs: 3, sm: 4 },
          borderRadius: t.radius.card,
          borderColor: 'border.subtle',
          bgcolor: 'surface.subtle',
          backdropFilter: 'blur(12px)',
          boxShadow: t.elevation.card,
        })}
      >
        <Stack spacing={3}>
          <Typography variant="h5">Sign in</Typography>
          <Stack spacing={1.5}>
            {oidcLogin && (
              <Button variant="contained" size="large" disableElevation fullWidth onClick={oidcLogin}>
                Sign in with your account
              </Button>
            )}
            {userPassLogin && (
              <Button variant="contained" size="large" disableElevation fullWidth onClick={userPassLogin}>
                Sign in with a password
              </Button>
            )}
          </Stack>
          {guestLogin && (
            <Stack spacing={1}>
              <Button variant="outlined" color="inherit" size="large" fullWidth onClick={guestLogin}>
                Continue with an email code
              </Button>
              <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
                For people invited to a shared expense group.
              </Typography>
            </Stack>
          )}
          <Stack spacing={1}>
            <SecureButton
              variant="text"
              color="inherit"
              size="large"
              fullWidth
              onClick={() => demoLogin().catch(console.error)}
            >
              Explore a demo
            </SecureButton>
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
              Ten years of generated finances, read-only, kept in this browser until you log out.
            </Typography>
          </Stack>
        </Stack>
      </Paper>
    </Stack>
  </Box>
)

export default LandingPage
