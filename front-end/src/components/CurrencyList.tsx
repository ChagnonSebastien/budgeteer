import { IonItem, IonLoading } from "@ionic/react"
import { Fragment, useMemo } from "react"
import Account from "../domain/model/account"
import Category from "../domain/model/category"
import Currency from "../domain/model/currency"
import IconCapsule from "./IconCapsule"

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