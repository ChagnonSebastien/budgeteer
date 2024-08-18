import { IonItem } from "@ionic/react"
import Currency from "../domain/model/currency"

interface Props {
  currencies: Currency[],
  onSelect: (value: number) => void
}

export const CurrencyList = (props: Props) => {
  const {currencies, onSelect} = props

  return (
    <>
      {currencies.map(currency => (
        <IonItem key={`account-list-${currency.id}`} onClick={() => onSelect(currency.id)}>
          {currency.symbol} - {currency.name}
        </IonItem>
      ))}
    </>
  )
}