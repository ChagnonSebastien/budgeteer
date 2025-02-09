import { startOfDay } from 'date-fns'
import { useContext, useState } from 'react'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Props = {
  account: Account
  onSelect?: (value: Account) => void
  selected?: number[]
  onMultiSelect?: (value: number[]) => void
  showBalances?: boolean
}

export const AccountCard = (props: Props) => {
  const { account, onSelect, showBalances = false, onMultiSelect, selected } = props
  const { accountBalances, exchangeRateOnDay } = useContext(MixedAugmentation)
  const { privacyMode } = useContext(DrawerContext)
  const { IconLib } = useContext(IconToolsContext)
  const [showBreakdown, setShowBreakdown] = useState(false)

  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)

  const totalValue = [...(accountBalances?.get(account.id)?.entries() ?? [])].reduce((prev: number, entry) => {
    const currency = currencies.find((c) => c.id === entry[0])
    if (typeof currency === 'undefined' || defaultCurrency === null) return prev

    let rate = 1
    if (entry[0] !== defaultCurrency.id) {
      rate = exchangeRateOnDay(entry[0], defaultCurrency.id, startOfDay(new Date()))
    }

    return prev + entry[1] * rate
  }, 0)

  return (
    <div
      style={{
        padding: showBalances ? '1.25rem' : '0.25rem .5rem',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        borderRadius: showBalances ? '12px' : '4px',
        border: showBalances ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
        transition: 'all 0.1s ease-out',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      onClick={() => {
        if (typeof onSelect !== 'undefined') {
          onSelect(account)
        } else if (typeof onMultiSelect !== 'undefined') {
          if (typeof selected !== 'undefined' && selected.includes(account.id)) {
            onMultiSelect(selected?.filter((a) => a !== account.id) ?? [account.id])
          } else if (typeof selected !== 'undefined') {
            onMultiSelect([...selected, account.id])
          } else {
            onMultiSelect([account.id])
          }
        }
      }}
    >
      <div
        style={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: showBalances ? '0.75rem' : '0',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: showBalances ? '1.1rem' : '1rem',
            opacity: showBalances ? 0.9 : 0.8,
            width: '100%',
            minWidth: 0,
          }}
        >
          {typeof selected !== 'undefined' ? (
            selected.includes(account.id) ? (
              <IconLib.FaRegSquareCheck
                size={showBalances ? '1.5rem' : '1.25rem'}
                style={{ marginRight: showBalances ? '0.75rem' : '0.5rem', opacity: 0.8 }}
              />
            ) : (
              <IconLib.FaRegSquare
                size={showBalances ? '1.5rem' : '1.25rem'}
                style={{ marginRight: showBalances ? '0.75rem' : '0.5rem', opacity: 0.5 }}
              />
            )
          ) : null}
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {account.name}
          </span>
        </div>
        {showBalances && defaultCurrency !== null && totalValue !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'end', opacity: 0.8 }}>
            <div
              style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
              onClick={(ev) => {
                setShowBreakdown((prev) => !prev)
                ev.preventDefault()
                ev.stopPropagation()
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'end', alignItems: 'center', fontWeight: 'bold' }}>
                {formatFull(defaultCurrency, totalValue, privacyMode)}
                <div style={{ width: '.5rem' }} />
                <IconLib.MdArrowForwardIos
                  style={{
                    transform: `rotate(${90 + (showBreakdown ? 180 : 0)}deg)`,
                    transition: 'transform 0.1s ease-out',
                  }}
                />
              </div>
              {showBreakdown &&
                [...(accountBalances?.get(account.id)?.entries() ?? [])]
                  .filter((entry) => entry[1] !== 0)
                  .map((entry) => {
                    const currency = currencies.find((c) => c.id === entry[0])
                    if (typeof currency === 'undefined') {
                      return null
                    }

                    return (
                      <div key={`currency-in-account-${entry[0]}`} style={{ textAlign: 'right', marginTop: '0.25rem' }}>
                        {formatFull(currency, entry[1], privacyMode)}
                      </div>
                    )
                  })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
