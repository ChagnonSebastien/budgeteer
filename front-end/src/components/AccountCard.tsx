import { startOfDay } from 'date-fns'
import { useContext } from 'react'

import { DrawerContext } from './Menu'
import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

import '../styles/account-list-tailwind.css'

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

  const handleClick = () => {
    if (onSelect) {
      onSelect(account)
    } else if (onMultiSelect) {
      if (selected?.includes(account.id)) {
        onMultiSelect(selected.filter((id) => id !== account.id))
      } else {
        onMultiSelect([...(selected || []), account.id])
      }
    }
  }

  return (
    <div
      className={`account-list-item ${selected?.includes(account.id) ? 'selected' : ''} ${showBalances ? 'with-balance' : ''}`}
      onClick={handleClick}
    >
      <div className={`account-content ${showBalances ? 'with-balance' : ''}`}>
        <div className="account-main">
          <div className="account-name">{account.name}</div>
          {showBalances && defaultCurrency !== null && totalValue !== 0 && (
            <div className="account-balance">
              <div className="account-total">{formatFull(defaultCurrency, totalValue, privacyMode)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
