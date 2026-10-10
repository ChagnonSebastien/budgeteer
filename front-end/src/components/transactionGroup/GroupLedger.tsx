import { Typography } from '@mui/material'
import { FC, ReactNode, useContext, useMemo } from 'react'
import { default as styled } from 'styled-components'

import Currency, { formatFull, RateAutoupdateSettings } from '../../domain/model/currency'
import { SettlementAugmentedTransaction } from '../../domain/model/settlement'
import { AugmentedTransaction } from '../../domain/model/transaction'
import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { DrawerContext } from '../Menu'
import { Column, Row } from '../shared/Layout'

export const FirstDivision = styled.div`
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.5rem;
  margin: 0 auto;
  padding: 1.5rem clamp(0.75rem, 4vw, 1.5rem);
`

export const SecondDivision = styled(Column)<{ $splitView?: boolean }>`
  padding: 1rem clamp(0.5rem, 4vw, 2rem);
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(128,128,128,0.2)')};
  height: ${(props) => (props.$splitView ? '100%' : 'auto')};
  gap: 2rem;
  align-self: stretch;
`

const Panel = styled.div`
  background-color: rgba(128, 128, 128, 0.08);
  border: 1px solid rgba(128, 128, 128, 0.16);
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
`

export const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Column style={{ gap: '0.5rem' }}>
    <Typography variant="overline" color="textSecondary" lineHeight={1} letterSpacing="0.08em">
      {title}
    </Typography>
    <Panel>{children}</Panel>
  </Column>
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
    <Column>
      {members.map((member, index) => {
        const balance = balances.get(member.email)!
        return (
          <Row
            key={member.email}
            style={{
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.5rem 0',
              borderTop: index === 0 ? undefined : '1px solid rgba(128,128,128,0.12)',
            }}
          >
            <Column style={{ minWidth: 0 }}>
              <Typography fontWeight="600" fontSize="0.95rem" textOverflow="ellipsis" overflow="hidden">
                {member.name}
              </Typography>
              <Typography fontSize="0.8rem" color="textDisabled">
                Paid {format(paid.get(member.email)!)}
              </Typography>
            </Column>
            <Typography
              fontSize="0.9rem"
              fontWeight="500"
              whiteSpace="nowrap"
              color={balance > 0 ? 'success.main' : balance < 0 ? 'error.main' : 'textDisabled'}
            >
              {balance > 0 ? `Is owed ${format(balance)}` : balance < 0 ? `Owes ${format(-balance)}` : 'Settled'}
            </Typography>
          </Row>
        )
      })}
      <Row
        style={{
          justifyContent: 'space-between',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(128,128,128,0.24)',
        }}
      >
        <Typography fontSize="0.85rem" color="textSecondary">
          Total paid
        </Typography>
        <Typography fontSize="0.85rem" fontWeight="600">
          {format(total)}
        </Typography>
      </Row>
    </Column>
  )
}
