import { ListItemButton, Typography } from '@mui/material'

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
        <div key={`account-list-${currency.id}`}>
          <ListItemButton onClick={() => onSelect(currency.id)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexGrow: 1 }}>
              <div>
                <div>{currency.name}</div>
                <Typography variant="caption" color="textSecondary">
                  {currency.type}
                </Typography>
              </div>
              <div>{currency.symbol}</div>
            </div>
          </ListItemButton>
        </div>
      ))}
    </>
  )
}
