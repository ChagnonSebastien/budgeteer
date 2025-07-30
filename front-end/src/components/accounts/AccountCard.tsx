import { Typography } from '@mui/material'
import { startOfDay } from 'date-fns'
import { useContext } from 'react'

import { ItemProps } from './ItemList'
import Account, { AccountID } from '../../domain/model/account'
import { formatFull } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { CurrencyServiceContext } from '../../service/ServiceContext'
import { DrawerContext } from '../Menu'
import { GradientCard } from '../shared/NoteContainer'

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
      style={{
        padding: showBalances ? '1rem 1.5rem' : '0.75rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
      }}
    >
      <Typography variant="subtitle1">{item.name}</Typography>

      {showBalances && (
        <Typography style={{ alignSelf: 'flex-end' }}>
          {formatFull(defaultCurrency, totalValue, privacyMode)}
        </Typography>
      )}
    </GradientCard>
  )
}

export default AccountCard
