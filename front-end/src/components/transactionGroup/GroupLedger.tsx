import { Typography } from '@mui/material'
import { FC, useContext, useMemo } from 'react'
import { default as styled } from 'styled-components'

import Currency, { formatFull, RateAutoupdateSettings } from '../../domain/model/currency'
import { AugmentedTransaction } from '../../domain/model/transaction'
import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
import { DrawerContext } from '../Menu'
import { Column } from '../shared/Layout'

export const FirstDivision = styled.div`
  width: 100%;
  max-width: 100vh;
  align-items: center;
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  margin: 0 auto;
  padding: 2rem;
  flex-grow: 1;
`

export const SecondDivision = styled(Column)<{ $splitView?: boolean }>`
  padding: 1rem clamp(0.5rem, 4vw, 2rem);
  border-top: ${(props) => (props.$splitView ? 'none' : '1px solid rgba(128,128,128,0.2)')};
  height: ${(props) => (props.$splitView ? '100%' : 'auto')};
  gap: 2rem;
  align-self: stretch;
`

export const Table = styled.table`
  border-spacing: 0;

  & > thead tr th {
    border-bottom: 3px solid rgba(128, 128, 128, 0.5);
  }

  & > * > * > * {
    padding: 0.5rem 1rem;
  }

  & > tbody > * > :nth-child(2) {
    text-align: end;
    font-family: monospace;
  }

  & > tbody > :last-child > * {
    border-top: 1px solid rgba(128, 128, 128, 0.5);
  }
`

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

export const memberName = (members: Person[], email: Email): string =>
  members.find((m) => m.email === email)?.name ?? email

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
      paid.set(transaction.owner, (paid.get(transaction.owner) ?? 0) + transaction.amount)
      for (const member of members) {
        balances.set(member.email, balances.get(member.email)! + transaction.getUserContribution(member.email))
      }
    }
    return { paid, balances }
  }, [members, transactions])

  const total = useMemo(() => [...paid.values()].reduce((a, b) => a + b, 0), [paid])
  const format = (amount: number) => formatFull(currency, amount, privacyMode)

  return (
    <Table>
      <thead>
        <tr>
          <th>User</th>
          <th>Payed</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {members.map((member) => {
          const balance = balances.get(member.email)!
          return (
            <tr key={`table-user-${member.email}`}>
              <td>{member.name}</td>
              <td>{format(paid.get(member.email)!)}</td>
              <td>
                <Typography
                  component="span"
                  fontSize="inherit"
                  whiteSpace="nowrap"
                  color={balance > 0 ? 'success.main' : balance < 0 ? 'error.main' : 'textDisabled'}
                >
                  {balance > 0 ? `Is owed ${format(balance)}` : balance < 0 ? `Owes ${format(-balance)}` : 'Settled'}
                </Typography>
              </td>
            </tr>
          )
        })}
        <tr>
          <td />
          <td>{format(total)}</td>
          <td />
        </tr>
      </tbody>
    </Table>
  )
}
