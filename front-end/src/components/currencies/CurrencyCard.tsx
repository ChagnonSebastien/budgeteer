import { Box, Stack, Typography } from '@mui/material'
import { useContext } from 'react'

import { hasRateFetchFailure } from './useRateFetchFailures'
import Currency, { CurrencyID, formatAmount } from '../../domain/model/currency'
import { ItemProps } from '../accounts/ItemList'
import { IconToolsContext } from '../icons/IconTools'
import { DrawerContext } from '../Menu'
import { GradientCard } from '../shared/Layout'

export type AdditionalCurrencyCardProps = {
  total?(id: CurrencyID): number
  square?: boolean
}

const CurrencyCard = (props: ItemProps<CurrencyID, Currency, AdditionalCurrencyCardProps>) => {
  const { item, onClick = () => {}, selected = false, total, square = false } = props
  const { IconLib } = useContext(IconToolsContext)
  const { privacyMode } = useContext(DrawerContext)
  const balance = total?.(item.id)
  const unused = balance === 0
  const iconColor = hasRateFetchFailure(item) ? 'error.main' : 'common.white'

  if (square) {
    return (
      <GradientCard
        $selected={selected}
        $hoverEffect
        onClick={onClick}
        $withGradientBackground={true}
        sx={{
          aspectRatio: '1',
          m: 0,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          p: { xs: 1.5, sm: 2 },
          gap: 1,
          opacity: unused ? 0.55 : 1,
        }}
      >
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ color: iconColor, display: 'flex', flexShrink: 0, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            <IconLib.MdCurrencyExchange size="1em" />
          </Box>
          <Typography variant="subtitle2" color="textDisabled" noWrap title={item.symbol} sx={{ minWidth: 0 }}>
            {item.symbol}
          </Typography>
        </Stack>

        <Typography
          variant="subtitle1"
          fontWeight={500}
          title={item.name}
          sx={{
            flexGrow: 1,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            lineHeight: 1.35,
            fontSize: { xs: '0.9rem', sm: '1rem' },
          }}
        >
          {item.name}
        </Typography>

        {unused ? (
          <Typography variant="caption" color="textDisabled">
            Unused
          </Typography>
        ) : (
          typeof balance !== 'undefined' && (
            <Typography
              variant="h6"
              fontFamily="monospace"
              noWrap
              title={formatAmount(item, balance, privacyMode)}
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              {formatAmount(item, balance, privacyMode)}
            </Typography>
          )
        )}
      </GradientCard>
    )
  }

  return (
    <GradientCard
      $selected={selected}
      $hoverEffect
      onClick={onClick}
      $withGradientBackground={true}
      sx={{ display: 'flex', alignItems: 'center', p: { xs: 1.5, sm: 2 }, gap: 1.5, opacity: unused ? 0.55 : 1 }}
    >
      <Box
        sx={{
          p: { xs: 0.5, sm: 1 },
          color: iconColor,
          display: 'flex',
          flexShrink: 0,
          fontSize: { xs: '1.25rem', sm: '1.5rem' },
        }}
      >
        <IconLib.MdCurrencyExchange size="1em" />
      </Box>

      <Typography
        variant="subtitle1"
        fontWeight={500}
        title={item.name}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          overflowWrap: 'anywhere',
          lineHeight: 1.35,
          fontSize: { xs: '0.9rem', sm: '1rem' },
        }}
      >
        {item.name}
      </Typography>

      <Stack sx={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: '40%' }}>
        {unused ? (
          <Typography variant="caption" color="textDisabled">
            Unused
          </Typography>
        ) : (
          typeof balance !== 'undefined' && (
            <Typography
              variant="h6"
              fontFamily="monospace"
              whiteSpace="nowrap"
              sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
            >
              {formatAmount(item, balance, privacyMode)}
            </Typography>
          )
        )}
        <Typography
          variant="subtitle1"
          color="textDisabled"
          noWrap
          title={item.symbol}
          sx={{ maxWidth: '100%', fontSize: { xs: '0.8rem', sm: '1rem' } }}
        >
          {item.symbol}
        </Typography>
      </Stack>
    </GradientCard>
  )
}

export default CurrencyCard
