import { Dispatch, SetStateAction, useContext, useEffect, useRef } from 'react'
import styled from 'styled-components'

import Currency, { CurrencyID, formatAmount } from '../../domain/model/currency'
import MixedAugmentation from '../../service/MixedAugmentation'
import { AccountServiceContext } from '../../service/ServiceContext'
import { IconToolsContext } from '../icons/IconTools'
import { SearchOverlay } from '../inputs/SearchOverlay'
import { DrawerContext } from '../Menu'
import { CustomScrollbarContainer } from '../shared/CustomScrollbarContainer'

const CurrencyItem = styled.div<{ focused: boolean }>`
  padding: 1rem 1.5rem;
  cursor: pointer;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02));
  border-radius: 1rem;

  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  transition: all 200ms ease-in-out;
  border-left: 3px solid ${(props) => (props.focused ? '#C84B31' : 'transparent')};
  margin: 0.25rem 0;

  &:hover {
    background-color: rgba(255, 255, 255, 0.08);
    transform: translateY(-2px) scale(1.01);
    box-shadow:
      0 10px 15px -3px rgba(0, 0, 0, 0.1),
      0 4px 6px -2px rgba(0, 0, 0, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
  }

  ${(props) =>
    props.focused &&
    `
    background-color: rgba(200, 75, 49, 0.08);
    border-left-color: #C84B31;

    &:hover {
      background-color: rgba(200, 75, 49, 0.12);
    }
  `}
`

interface Props {
  currencies: Currency[]
  onSelect: (value: CurrencyID) => void
  showZeroBalances?: boolean
  onScrollProgress?: (progress: number) => void
  filterable?: {
    filter: string
    setFilter: Dispatch<SetStateAction<string>>
  }
  onFilteredCurrenciesChange?: (currencies: Currency[]) => void
  focusedCurrency?: CurrencyID | null
  hideSearchOverlay?: boolean
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

  // Call onFilteredCurrenciesChange when filtered currencies change
  useEffect(() => {
    if (props.onFilteredCurrenciesChange) {
      props.onFilteredCurrenciesChange(filteredCurrencies)
    }
  }, [filteredCurrencies, props.onFilteredCurrenciesChange])

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
      <CustomScrollbarContainer
        ref={contentRef}
        style={{
          overflowY: 'auto',
          flexGrow: 1,
          paddingBottom: '4rem',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            padding: '0.5rem 0.75rem 0.5rem 0.25rem',
          }}
        >
          {filteredCurrencies.map((currency) => {
            const total = getTotalForCurrency(currency.id)
            if (!showZeroBalances && total === 0) return null
            return (
              <CurrencyItem
                key={`currency-list-${currency.id}`}
                focused={props.focusedCurrency === currency.id}
                onClick={() => onSelect(currency.id)}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        borderRadius: '0.75rem',
                        padding: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '1.25rem',
                      }}
                    >
                      <IconLib.BsCurrencyExchange style={{ color: 'white', fontSize: '1.5rem' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 500, letterSpacing: '0.01em' }}>
                        {currency.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 600 }}>
                      {formatAmount(currency, total, privacyMode)}
                    </div>
                    <div
                      style={{
                        fontSize: '0.95rem',
                        fontWeight: 400,
                        letterSpacing: '0.02em',
                        backgroundColor: 'var(--ion-color-primary)',
                        borderRadius: '0.375rem',
                        color: '#d1d5db',
                      }}
                    >
                      {currency.symbol}
                    </div>
                  </div>
                </div>
              </CurrencyItem>
            )
          })}
        </div>
      </CustomScrollbarContainer>
      {filterable && !props.hideSearchOverlay && (
        <SearchOverlay filter={filterable.filter} setFilter={filterable.setFilter} placeholder="Search currencies..." />
      )}
    </div>
  )
}
