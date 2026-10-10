import { Typography } from '@mui/material'
import { startOfDay } from 'date-fns'
import { useContext } from 'react'

import { ItemProps } from './ItemList'
import Account, { AccountID } from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import { DrawerContext } from '../Menu'
import { GradientCard } from '../shared/Layout'

export type AdditionalAccountCardProps = {
  showBalances?: boolean
}

const AccountCard = (props: ItemProps<AccountID, Account, AdditionalAccountCardProps>) => {
  const { item, selected = false, onClick = () => {}, showBalances = false } = props
  const { accountBalances, exchangeRateOnDay, defaultCurrency } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)

  const { state: currencies } = useContext(CurrencyServiceContext)

  const totalValue = [...(accountBalances?.get(item.id)?.entries() ?? [])].reduce((prev: number, entry) => {
    const currency = currencies.find((c) => c.id === entry[0])
    if (typeof currency === 'undefined') return prev

    let rate = 1
    if (entry[0] !== defaultCurrency.id) {
      rate = exchangeRateOnDay(entry[0], defaultCurrency.id, startOfDay(new Date()))
    }

    return prev + entry[1] * rate
  }, 0)

  return (
    <GradientCard
      $selected={selected}
      $withGradientBackground={showBalances}
      $hoverEffect
      onClick={onClick}
      sx={{
        py: showBalances ? { xs: 1.5, sm: 2 } : 1.5,
        px: showBalances ? { xs: 2, sm: 3 } : 2,
        display: 'flex',
        flexDirection: 'column',
        gap: { xs: 0.5, sm: 1 },
      }}
    >
      <Typography
        variant="subtitle1"
        title={item.name}
        sx={{
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

      {showBalances && (
        <Typography sx={{ alignSelf: 'flex-end', whiteSpace: 'nowrap', fontSize: { xs: '0.9rem', sm: '1rem' } }}>
          {formatFull(defaultCurrency, totalValue, privacyMode)}
        </Typography>
      )}
    </GradientCard>
  )
}

export default AccountCard
