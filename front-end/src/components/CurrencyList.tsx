import { ListItemButton } from '@mui/material'

import Currency from '../domain/model/currency'

interface Props {
  currencies: Currency[]
  onSelect: (value: number) => void
}

export const CurrencyList = (props: Props) => {
  const { currencies, onSelect } = props

  return (
    <>
      {currencies.map((currency) => (
        <ListItemButton key={`account-list-${currency.id}`} onClick={() => onSelect(currency.id)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexGrow: 1 }}>
            <div>{currency.name}</div>
            <div>{currency.symbol}</div>
          </div>
        </ListItemButton>
      ))}
    </>
  )
}
