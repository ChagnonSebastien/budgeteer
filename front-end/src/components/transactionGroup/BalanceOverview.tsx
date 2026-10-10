import { Stack, Typography } from '@mui/material'
import { FC, useContext } from 'react'

import Currency, { formatFull } from '../../domain/model/currency'
import { DrawerContext } from '../Menu'

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
    <Stack sx={{ gap: 2, pt: 1, px: 0, pb: 2, borderBottom: 1, borderColor: 'border.subtle' }}>
      {open.length === 0 ? (
        <Typography variant="h6" fontWeight="600">
          You're all settled up
        </Typography>
      ) : (
        open.map(({ currency, owed, owe }) => {
          const net = owed + owe
          return (
            <Stack key={currency.name} sx={{ gap: 0.25 }}>
              <Typography variant="body2" color="textSecondary">
                {net > 0 ? 'Overall, you are owed' : net < 0 ? 'Overall, you owe' : 'Overall, you are even'}
              </Typography>
              <Typography variant="h4" fontWeight="600" lineHeight={1.15}>
                {format(currency, net)}
              </Typography>
              {owed !== 0 && owe !== 0 && (
                <Typography variant="body2" color="textDisabled">
                  You owe {format(currency, owe)} · You are owed {format(currency, owed)}
                </Typography>
              )}
            </Stack>
          )
        })
      )}
    </Stack>
  )
}

export default BalanceOverview
