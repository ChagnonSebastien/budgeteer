import { Typography } from '@mui/material'
import { FC, useContext } from 'react'

import Currency, { formatFull } from '../../domain/model/currency'
import { DrawerContext } from '../Menu'
import { Column } from '../shared/Layout'

export interface CurrencyTotals {
  currency: Currency
  owed: number
  owe: number
}

const BalanceOverview: FC<{ totals: CurrencyTotals[] }> = ({ totals }) => {
  const { privacyMode } = useContext(DrawerContext)
  const format = (currency: Currency, amount: number) => formatFull(currency, Math.abs(amount), privacyMode)
  const open = totals.filter((t) => t.owed !== 0 || t.owe !== 0)

  return (
    <Column style={{ gap: '1rem', padding: '0.5rem 0 1rem', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
      {open.length === 0 ? (
        <Typography variant="h6" fontWeight="600">
          You're all settled up
        </Typography>
      ) : (
        open.map(({ currency, owed, owe }) => {
          const net = owed + owe
          return (
            <Column key={currency.name} style={{ gap: '0.15rem' }}>
              <Typography variant="body2" color="textSecondary">
                {net > 0 ? 'Overall, you are owed' : net < 0 ? 'Overall, you owe' : 'Overall, you are even'}
              </Typography>
              <Typography fontSize="2rem" fontWeight="600" lineHeight={1.15}>
                {format(currency, net)}
              </Typography>
              {owed !== 0 && owe !== 0 && (
                <Typography variant="body2" color="textDisabled">
                  You owe {format(currency, owe)} · You are owed {format(currency, owed)}
                </Typography>
              )}
            </Column>
          )
        })
      )}
    </Column>
  )
}

export default BalanceOverview
