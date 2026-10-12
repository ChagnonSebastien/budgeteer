import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { FC } from 'react'
import { IconType } from 'react-icons'
import { MdCurrencyExchange, MdGroups, MdOutlineInsights } from 'react-icons/md'

import { SecureButton } from './shared/SecureButton'

interface Props {
  oidcLogin: (() => void) | null
  userPassLogin: (() => void) | null
  guestLogin: (() => void) | null
  demoLogin: () => Promise<void>
}

const features: { Icon: IconType; title: string; text: string }[] = [
  {
    Icon: MdOutlineInsights,
    title: 'See where it goes',
    text: 'Categories, trends and balances over time, across every account.',
  },
  {
    Icon: MdCurrencyExchange,
    title: 'Any currency or asset',
    text: 'Track accounts in multiple currencies, stocks or ETFs with rates updated daily.',
  },
  {
    Icon: MdGroups,
    title: 'Split with others',
    text: 'Share expense groups and settle up, even with people who only have an email.',
  },
]

const LandingPage: FC<Props> = ({ oidcLogin, userPassLogin, guestLogin, demoLogin }) => (
  <Box sx={{ display: 'flex', minHeight: '100vh', px: 2, py: { xs: 4, md: 8 } }}>
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={{ xs: 4, md: 8 }}
      useFlexGap
      sx={(t) => ({
        m: 'auto',
        width: '100%',
        maxWidth: { xs: t.contentWidth.compact, md: t.contentWidth.wide },
        alignItems: { md: 'center' },
      })}
    >
      {/* On phones the column dissolves so the sign-in card can sit right under the headline. */}
      <Stack spacing={4} useFlexGap sx={{ flex: 1, minWidth: 0, display: { xs: 'contents', md: 'flex' } }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Box component="img" src="/icon.svg" alt="" sx={{ width: 40, height: 40 }} />
          <Typography variant="h6">Fintrospect</Typography>
        </Stack>

        <Stack spacing={2} sx={{ order: 1 }}>
          <Typography variant="hero" component="h1" sx={{ fontSize: { xs: '2.25rem', sm: '2.75rem' } }}>
            Know where your money{' '}
            <Box
              component="span"
              sx={{
                backgroundImage: (t) => t.palette.brand.gradient,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              goes
            </Box>
            .
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ maxWidth: (t) => t.contentWidth.compact }}>
            Your whole financial picture, past and present. Works offline on your phone or desktop, and keeps your data
            on your own server.
          </Typography>
        </Stack>

        <Stack spacing={2.5} sx={{ order: 3 }}>
          {features.map(({ Icon, title, text }) => (
            <Stack key={title} direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  width: 36,
                  height: 36,
                  borderRadius: (t) => t.radius.md,
                  bgcolor: 'surface.raised',
                  color: 'primary.main',
                  fontSize: 20,
                }}
              >
                <Icon />
              </Box>
              <Stack>
                <Typography variant="subtitle1">{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {text}
                </Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Paper
        variant="outlined"
        sx={(t) => ({
          p: { xs: 3, sm: 4 },
          order: { xs: 2, md: 0 },
          width: '100%',
          maxWidth: { md: t.contentWidth.dialog },
          flexShrink: 0,
          borderRadius: t.radius.card,
          borderColor: 'border.subtle',
          bgcolor: 'surface.subtle',
          backdropFilter: 'blur(12px)',
          boxShadow: t.elevation.card,
        })}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h5">Sign in</Typography>
            <Typography variant="body2" color="text.secondary">
              Pick how you want to access your finances.
            </Typography>
          </Stack>
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
