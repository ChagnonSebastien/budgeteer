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

  const { state: currencies, defaultCurrency } = useContext(CurrencyServiceContext)

  const [showBreakdown, setShowBreakdown] = useState(false)

  const totalValue = [...(accountBalances?.get(account.id)?.entries() ?? [])].reduce((prev, entry) => {
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
      style={
        showBalances
          ? { background: '#FFF1', padding: '.5rem 1rem', margin: '.5rem', borderRadius: '.5rem' }
          : { margin: '0.25rem', cursor: 'pointer' }
      }
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
      <div style={{ flexGrow: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {typeof selected !== 'undefined' ? (
            selected.includes(account.id) ? (
              <IconLib.FaRegSquareCheck size="1.5rem" style={{ marginRight: '.5rem' }} />
            ) : (
              <IconLib.FaRegSquare size="1.5rem" style={{ marginRight: '.5rem' }} />
            )
          ) : null}
          {account.name}
        </div>
        {showBalances && defaultCurrency !== null && totalValue !== 0 && (
          <div style={{ display: 'flex', justifyContent: 'end' }}>
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
                    transition: 'transform 0.2s ease-in-out',
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
                      <div key={`currency-in-account-${entry[0]}`} style={{ textAlign: 'right' }}>
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
