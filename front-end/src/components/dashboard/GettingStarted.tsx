import { Box, Button, Typography } from '@mui/material'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { UpdatePreferencesContext, UserContext } from '../../App'
import MixedAugmentation from '../../service/MixedAugmentation'
import { TransactionGroupServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import Layout, { Column, Row } from '../shared/Layout'
import { useToast } from '../shared/ToastProvider'

interface Step {
  title: string
  description: string
  done: boolean
  action: string
  path: string
}

const GettingStarted: FC = () => {
  const navigate = useNavigate()
  const { email, preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { showToast } = useToast()
  const { IconLib } = useContext(IconToolsContext)
  const { augmentedTransactions } = useContext(MixedAugmentation)
  const { state: transactionGroups } = useContext(TransactionGroupServiceContext)

  const invitations = transactionGroups.filter((g) => !g.hasJoined(email)).length
  const steps: Step[] = [
    {
      title: 'Record a transaction',
      description: 'Your charts, balances and trends fill in as you record what you spend and earn.',
      done: augmentedTransactions.length > 0,
      action: 'Record one',
      path: '/transactions/new?type=expense',
    },
    {
      title: 'Share expenses with others',
      description:
        invitations > 0
          ? `You have ${invitations} pending invitation${invitations > 1 ? 's' : ''} to a transaction group.`
          : 'Create a transaction group to split costs with friends and settle up.',
      done: transactionGroups.some((g) => g.hasJoined(email)),
      action: invitations > 0 ? 'See invitations' : 'Open groups',
      path: '/transaction-groups',
    },
  ]

  if (preferences?.gettingStartedDismissed) return null

  return (
    <Layout title="Getting started">
      <Column style={{ gap: '1.25rem', width: '100%' }}>
        {steps.map((step, index) => (
          <Row key={step.title} style={{ gap: '1rem', alignItems: 'center' }}>
            <Box
              sx={{
                width: '2rem',
                height: '2rem',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: step.done ? 'none' : '1px solid rgba(128,128,128,0.4)',
                color: step.done ? 'success.main' : 'text.secondary',
                fontSize: step.done ? '2rem' : '0.9rem',
              }}
            >
              {step.done ? <IconLib.MdCheckCircle /> : index + 1}
            </Box>
            <Column style={{ flexGrow: 1, minWidth: 0 }}>
              <Typography fontWeight="600" color={step.done ? 'textDisabled' : undefined}>
                {step.title}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {step.description}
              </Typography>
            </Column>
            {!step.done && (
              <Button variant="outlined" size="small" onClick={() => navigate(step.path)} sx={{ flexShrink: 0 }}>
                {step.action}
              </Button>
            )}
          </Row>
        ))}
        <Row style={{ justifyContent: 'flex-end' }}>
          <Button
            size="small"
            color="inherit"
            onClick={() =>
              updatePreferences({ gettingStartedDismissed: true }).catch(() =>
                showToast('Could not save your preference', 'error'),
              )
            }
          >
            Don't show again
          </Button>
        </Row>
      </Column>
    </Layout>
  )
}

export default GettingStarted
