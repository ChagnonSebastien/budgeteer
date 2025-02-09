import { useContext } from 'react'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import Currency, { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  currencies: Currency[]
  onSelect: (value: number) => void
  showZeroBalances?: boolean
}

export const CurrencyList = (props: Props) => {
  const { currencies, onSelect, showZeroBalances = true } = props
  const { IconLib } = useContext(IconToolsContext)
  const { accountBalances } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { state: accounts } = useContext(AccountServiceContext)

  const getTotalForCurrency = (targetCurrencyId: number): number => {
    let total = 0
    const myAccountIds = new Set(accounts.filter((account) => account.isMine).map((account) => account.id))

    accountBalances?.forEach((balances, accountId) => {
      if (!myAccountIds.has(accountId)) return
      const amount = balances.get(targetCurrencyId)
      if (amount) {
        total += amount
      }
    })
    return total
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {currencies.map((currency) => {
        const total = getTotalForCurrency(currency.id)
        if (!showZeroBalances && total === 0) return null
        return (
          <div
            key={`currency-list-${currency.id}`}
            style={{
              padding: '1rem 1.25rem',
              cursor: 'pointer',
              backgroundColor: 'transparent',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.1s ease-out',
            }}
            onClick={() => onSelect(currency.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
              e.currentTarget.style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <IconLib.BsCurrencyExchange
                  style={{
                    color: 'var(--ion-color-primary)',
                    marginRight: '1rem',
                    fontSize: '1.5rem',
                    opacity: 0.9,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ fontSize: '1.1rem', opacity: 0.9 }}>{currency.name}</div>
                  <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Symbol: {currency.symbol}</div>
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.1rem',
                  opacity: 0.9,
                  fontWeight: 'bold',
                  marginLeft: '1rem',
                }}
              >
                {formatFull(currency, total, privacyMode)}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
