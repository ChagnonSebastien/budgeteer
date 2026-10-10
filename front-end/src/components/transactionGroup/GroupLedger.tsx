import { Box, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { FC, ReactNode, useContext, useMemo } from 'react'

import Currency, { formatFull, RateAutoupdateSettings } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { AugmentedTransaction } from '../../domain/model/transaction'
import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { DrawerContext } from '../Menu'

export const FirstDivision = styled('div')(({ theme }) => ({
  width: '100%',
  maxWidth: theme.contentWidth.compact,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: theme.spacing(3),
  margin: '0 auto',
  padding: `${theme.spacing(3)} clamp(${theme.spacing(1.5)}, 4vw, ${theme.spacing(3)})`,
}))

export const SecondDivision = styled('div', {
  shouldForwardProp: (prop) => !String(prop).startsWith('$'),
})<{ $splitView?: boolean }>(({ theme, $splitView }) => ({
  display: 'flex',
  flexDirection: 'column',
  padding: `${theme.spacing(2)} clamp(${theme.spacing(1)}, 4vw, ${theme.spacing(4)})`,
  borderTop: $splitView ? 'none' : `1px solid ${theme.palette.border.subtle}`,
  height: $splitView ? '100%' : 'auto',
  gap: theme.spacing(4),
  alignSelf: 'stretch',
}))

const Panel = styled('div')(({ theme }) => ({
  backgroundColor: theme.palette.surface.muted,
  border: `1px solid ${theme.palette.surface.raised}`,
  borderRadius: theme.radius.md,
  padding: theme.spacing(1, 1.5),
}))

export const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Stack spacing={1}>
    <Typography variant="overline" color="textSecondary" lineHeight={1} letterSpacing="0.08em">
      {title}
    </Typography>
    <Panel>{children}</Panel>
  </Stack>
)

// Id 0: built only to format group amounts, never a currency the user owns.
export const groupCurrency = (group: TransactionGroup): Currency =>
  new Currency(
    0,
    group.originalCurrency,
    group.originalCurrencySymbol,
    '',
    '',
    group.originalCurrencyDecimalPoints,
    new RateAutoupdateSettings('', false),
  )

export const GroupPaidTable: FC<{ members: Person[]; transactions: AugmentedTransaction[]; currency: Currency }> = ({
  members,
  transactions,
  currency,
}) => {
  const { privacyMode } = useContext(DrawerContext)

  const { paid, balances } = useMemo(() => {
    const paid = new Map<Email, number>(members.map((m) => [m.email, 0]))
    const balances = new Map<Email, number>(members.map((m) => [m.email, 0]))
    for (const transaction of transactions) {
      // A settlement moves money between two people; it is not something either of them paid for the group.
      if (!(transaction instanceof SettlementAugmentedTransaction)) {
        paid.set(transaction.owner, (paid.get(transaction.owner) ?? 0) + transaction.amount)
      }
      for (const member of members) {
        balances.set(member.email, balances.get(member.email)! + transaction.getUserContribution(member.email))
      }
    }
    return { paid, balances }
  }, [members, transactions])

  const total = useMemo(() => [...paid.values()].reduce((a, b) => a + b, 0), [paid])
  const format = (amount: number) => formatFull(currency, amount, privacyMode)

  return (
    <Stack>
      {members.map((member, index) => {
        const balance = balances.get(member.email)!
        return (
          <Stack
            key={member.email}
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ py: 1, borderTop: index === 0 ? 0 : 1, borderColor: 'surface.raised' }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography fontWeight="600" textOverflow="ellipsis" overflow="hidden">
                {member.name}
              </Typography>
              <Typography variant="caption" color="textDisabled">
                Paid {format(paid.get(member.email)!)}
              </Typography>
            </Box>
            <Typography
              variant="body2"
              fontWeight="500"
              whiteSpace="nowrap"
              color={balance > 0 ? 'success.main' : balance < 0 ? 'error.main' : 'textDisabled'}
            >
              {balance > 0 ? `Is owed ${format(balance)}` : balance < 0 ? `Owes ${format(-balance)}` : 'Settled'}
            </Typography>
          </Stack>
        )
      })}
      <Stack direction="row" justifyContent="space-between" sx={{ pt: 1, borderTop: 1, borderColor: 'surface.strong' }}>
        <Typography variant="body2" color="textSecondary">
          Total paid
        </Typography>
        <Typography variant="body2" fontWeight="600">
          {format(total)}
        </Typography>
      </Stack>
    </Stack>
  )
}
