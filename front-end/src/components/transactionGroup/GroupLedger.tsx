import { FC, useMemo } from 'react'
import { default as styled } from 'styled-components'

import Currency, { formatFull, RateAutoupdateSettings } from '../../domain/model/currency'
import TransactionGroup, { Email, Person } from '../../domain/model/transactionGroup'
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
    padding: 0.5rem 2rem;
  }

  & > tbody > * > :last-child {
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

export interface GroupLedgerEntry {
  key: string
  id: number
  owner: Email
  amount: number
  date: Date
  note: string
  unconfirmed: boolean
}

export const GroupPaidTable: FC<{ members: Person[]; entries: GroupLedgerEntry[]; currency: Currency }> = ({
  members,
  entries,
  currency,
}) => {
  const paid = useMemo(() => {
    const values = new Map<Email, number>()
    members.forEach((m) => values.set(m.email, 0))
    for (const entry of entries) {
      values.set(entry.owner, (values.get(entry.owner) ?? 0) + entry.amount)
    }
    return values
  }, [members, entries])

  const total = useMemo(() => [...paid.values()].reduce((a, b) => a + b, 0), [paid])

  return (
    <Table>
      <thead>
        <tr>
          <th>User</th>
          <th>Payed</th>
        </tr>
      </thead>
      <tbody>
        {[...paid.entries()].map(([email, amount]) => (
          <tr key={`table-user-${email}`}>
            <td>{memberName(members, email)}</td>
            <td>{formatFull(currency, amount)}</td>
          </tr>
        ))}
        <tr>
          <td />
          <td>{formatFull(currency, total)}</td>
        </tr>
      </tbody>
    </Table>
  )
}
