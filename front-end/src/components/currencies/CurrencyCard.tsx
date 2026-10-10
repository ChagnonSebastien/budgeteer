import { Box, Typography } from '@mui/material'
import { useContext } from 'react'

import Currency, { CurrencyID, formatAmount } from '../../domain/model/currency'
import { ItemProps } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { Column, GradientCard } from '../shared/Layout'

export type AdditionalCurrencyCardProps = {
  total?(id: CurrencyID): number
}

const CurrencyCard = (props: ItemProps<CurrencyID, Currency, AdditionalCurrencyCardProps>) => {
  const { item, onClick = () => {}, selected = false, total } = props
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const balance = total?.(item.id)
  const unused = balance === 0

  return (
    <GradientCard
      $selected={selected}
      $hoverEffect
      onClick={onClick}
      $withGradientBackground={true}
      sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2, opacity: unused ? 0.55 : 1 }}
    >
      <Box sx={{ p: 1.5, color: 'common.white', display: 'flex' }}>
        <IconLib.BsCurrencyExchange size="1.5rem" />
      </Box>

      <Typography variant="subtitle1" fontWeight={500} sx={{ flexGrow: 1 }}>
        {item.name}
      </Typography>

      <Column sx={{ alignItems: 'flex-end' }}>
        {unused ? (
          <Typography variant="caption" color="textDisabled">
            Unused
          </Typography>
        ) : (
          typeof balance !== 'undefined' && (
            <Typography variant="h6" fontFamily="monospace" whiteSpace="nowrap">
              {formatAmount(item, balance, privacyMode)}
            </Typography>
          )
        )}

        <Typography variant="subtitle1" color="textDisabled">
          {item.symbol}
        </Typography>
      </Column>
    </GradientCard>
  )
}

export default CurrencyCard
