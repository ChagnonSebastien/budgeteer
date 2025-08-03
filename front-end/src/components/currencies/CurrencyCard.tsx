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

  return (
    <GradientCard
      $selected={selected}
      $hoverEffect
      onClick={onClick}
      $withGradientBackground={true}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '1rem',
        gap: '1rem',
      }}
    >
      <Box sx={{ padding: '0.75rem' }}>
        <IconLib.BsCurrencyExchange style={{ color: 'white', fontSize: '1.5rem' }} />
      </Box>

      <Typography variant="h6" fontSize="1.1rem" sx={{ flexGrow: 1 }}>
        {item.name}
      </Typography>

      <Column style={{ alignItems: 'flex-end' }}>
        {total && (
          <Typography variant="h6" fontFamily="monospace" whiteSpace="nowrap">
            {formatAmount(item, total(item.id), privacyMode)}
          </Typography>
        )}

        <Typography variant="subtitle1" color="textDisabled">
          {item.symbol}
        </Typography>
      </Column>
    </GradientCard>
  )
}

export default CurrencyCard
