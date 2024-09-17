import { ListItemButton } from '@mui/material'
import { useContext } from 'react'

import Account from '../domain/model/account'
import { formatFull } from '../domain/model/currency'
import MixedAugmentation from '../service/MixedAugmentation'
import { CurrencyServiceContext } from '../service/ServiceContext'

type Props = {
  accounts: Account[]
  onSelect: (value: number) => void
  showBalances?: boolean
}

export const AccountList = (props: Props) => {
  const { accounts, onSelect, showBalances = false } = props
  const { accountBalances } = useContext(MixedAugmentation)

  const { state: currencies } = useContext(CurrencyServiceContext)

  return accounts.map((account) => {
    return (
      <ListItemButton key={`account-list-${account.id}`} onClick={() => onSelect(account.id)}>
        <div style={{ flexGrow: 1 }}>
          <div>{account.name}</div>
          {showBalances &&
            [...(accountBalances?.get(account.id)?.entries() ?? [])]
              .filter((entry) => entry[1] !== 0)
              .map((entry) => {
                const currency = currencies.find((c) => c.id === entry[0])
                if (typeof currency === 'undefined') {
                  return null
                }

                return (
                  <div key={`currency-in-account-${entry[0]}`} style={{ textAlign: 'right' }}>
                    {formatFull(currency, entry[1])}
                  </div>
                )
              })}
        </div>
      </ListItemButton>
    )
  })
}
