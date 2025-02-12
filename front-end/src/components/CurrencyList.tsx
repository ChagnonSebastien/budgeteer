import { Dispatch, SetStateAction, useContext, useEffect, useRef } from 'react'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import { SearchOverlay } from './SearchOverlay'
import Currency, { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'

interface Props {
  currencies: Currency[]
  onSelect: (value: number) => void
  showZeroBalances?: boolean
  onScrollProgress?: (progress: number) => void
  filterable?: {
    filter: string
    setFilter: Dispatch<SetStateAction<string>>
  }
}

export const CurrencyList = (props: Props) => {
  const { currencies, onSelect, showZeroBalances = true, onScrollProgress, filterable } = props
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

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!onScrollProgress || !contentRef.current) return
    const element = contentRef.current

    const handleScroll = () => {
      const maxScroll = element.scrollHeight - element.clientHeight
      const bufferZone = 64 // 4rem
      if (maxScroll <= 0) {
        onScrollProgress(0)
      } else {
        const remainingScroll = maxScroll - element.scrollTop
        if (remainingScroll > bufferZone) {
          onScrollProgress(1)
        } else {
          const progress = remainingScroll / bufferZone
          onScrollProgress(Math.max(0, Math.min(1, progress)))
        }
      }
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll)
    const observer = new ResizeObserver(handleScroll)
    observer.observe(element)

    return () => {
      element.removeEventListener('scroll', handleScroll)
      observer.disconnect()
    }
  }, [onScrollProgress, currencies, filterable?.filter])

  const filteredCurrencies = currencies.filter((currency) => {
    if (!filterable || !filterable.filter) return true
    const searchTerm = filterable.filter.toLowerCase()
    return currency.name.toLowerCase().includes(searchTerm) || currency.symbol.toLowerCase().includes(searchTerm)
  })

  return (
    <div
      style={{
        minWidth: '20rem',
        maxWidth: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <div ref={contentRef} style={{ overflowY: 'auto', flexGrow: 1, paddingBottom: '4rem', position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0.75rem 0 0.25rem' }}>
          {filteredCurrencies.map((currency) => {
            const total = getTotalForCurrency(currency.id)
            if (!showZeroBalances && total === 0) return null
            return (
              <div
                key={`currency-list-${currency.id}`}
                style={{
                  padding: '1rem 1.5rem',
                  cursor: 'pointer',
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 24px -8px rgba(0, 0, 0, 0.2)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                onClick={() => onSelect(currency.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.01)'
                  e.currentTarget.style.boxShadow = '0 8px 32px -8px rgba(0, 0, 0, 0.3)'
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)'
                  e.currentTarget.style.boxShadow = '0 4px 24px -8px rgba(0, 0, 0, 0.2)'
                  e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)'
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
                    <div
                      style={{
                        borderRadius: '12px',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1.25rem',
                      }}
                    >
                      <IconLib.BsCurrencyExchange
                        style={{
                          color: 'white',
                          fontSize: '1.5rem',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '500',
                          letterSpacing: '0.01em',
                        }}
                      >
                        {currency.name}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-end',
                      gap: '0.25rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: '600',
                      }}
                    >
                      {formatAmount(currency, total, privacyMode)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: '400',
                        letterSpacing: '0.02em',
                        background: 'var(--ion-color-primary)',
                        borderRadius: '6px',
                        color: 'lightgray',
                      }}
                    >
                      {currency.symbol}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {filterable && (
        <SearchOverlay filter={filterable.filter} setFilter={filterable.setFilter} placeholder="Search currencies..." />
      )}
    </div>
  )
}
