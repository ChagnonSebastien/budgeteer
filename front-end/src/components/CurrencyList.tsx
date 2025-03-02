import { Dispatch, SetStateAction, useContext, useEffect, useRef } from 'react'
import styled from 'styled-components'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import { SearchOverlay } from './SearchOverlay'
import Currency, { formatAmount } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { AccountServiceContext } from '../service/ServiceContext'

import '../styles/currency-list-tailwind.css'

const CurrencyListContainer = styled.div`
  min-width: 20rem;
  max-width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`

const ScrollableContent = styled.div`
  overflow-y: auto;
  flex-grow: 1;
  padding-bottom: 4rem;
  position: relative;
`

interface Props {
  currencies: Currency[]
  onSelect: (value: number) => void
  showZeroBalances?: boolean
  onScrollProgress?: (progress: number) => void
  filterable?: {
    filter: string
    setFilter: Dispatch<SetStateAction<string>>
  }
  onFilteredCurrenciesChange?: (currencies: Currency[]) => void
  focusedCurrency?: number | null
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
    <CurrencyListContainer>
      <ScrollableContent ref={contentRef} className="custom-scrollbar">
        <div className="currency-list-items">
          {filteredCurrencies.map((currency) => {
            const total = getTotalForCurrency(currency.id)
            if (!showZeroBalances && total === 0) return null
            return (
              <div
                key={`currency-list-${currency.id}`}
                className={`currency-item ${props.focusedCurrency === currency.id ? 'focused' : ''}`}
                onClick={() => onSelect(currency.id)}
              >
                <div className="currency-item-content">
                  <div className="currency-item-left">
                    <div className="currency-icon-container">
                      <IconLib.BsCurrencyExchange className="currency-icon" />
                    </div>
                    <div className="currency-info">
                      <div className="currency-name">{currency.name}</div>
                    </div>
                  </div>
                  <div className="currency-values">
                    <div className="currency-amount">{formatAmount(currency, total, privacyMode)}</div>
                    <div className="currency-symbol">{currency.symbol}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ScrollableContent>
      {filterable && !props.hideSearchOverlay && (
        <SearchOverlay filter={filterable.filter} setFilter={filterable.setFilter} placeholder="Search currencies..." />
      )}
    </CurrencyListContainer>
  )
}
