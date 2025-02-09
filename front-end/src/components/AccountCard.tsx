import { startOfDay } from 'date-fns'
import { useContext, useState } from 'react'

import { IconToolsContext } from './IconTools'
import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

import './AccountList.css'

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
      className={`account-list-item ${selected?.includes(account.id) ? 'selected' : ''} ${showBalances ? 'with-balance' : ''}`}
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
      <div className={`account-content ${showBalances ? 'with-balance' : ''}`}>
        <div className="account-main">
          <div className="account-name">{account.name}</div>
          {showBalances && defaultCurrency !== null && totalValue !== 0 && (
            <div
              className="account-balance"
              onClick={(ev) => {
                setShowBreakdown((prev) => !prev)
                ev.preventDefault()
                ev.stopPropagation()
              }}
            >
              <div className="account-total">
                {formatFull(defaultCurrency, totalValue, privacyMode)}
                <IconLib.MdArrowForwardIos className={`rotatable ${showBreakdown ? 'open' : ''}`} />
              </div>
              {showBreakdown && (
                <div className="account-breakdown">
                  {[...(accountBalances?.get(account.id)?.entries() ?? [])]
                    .filter((entry) => entry[1] !== 0)
                    .map((entry) => {
                      const currency = currencies.find((c) => c.id === entry[0])
                      if (typeof currency === 'undefined') {
                        return null
                      }

                      return (
                        <div key={`currency-in-account-${entry[0]}`} className="account-currency-amount">
                          {formatFull(currency, entry[1], privacyMode)}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
