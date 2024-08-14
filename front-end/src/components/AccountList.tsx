import { IonItem, IonLoading } from "@ionic/react"
import { Fragment, useMemo } from "react"
import Account from "../domain/model/account"
import Category from "../domain/model/category"
import IconCapsule from "./IconCapsule"

interface Props {
  accounts: Account[],
  onSelect: (value: number) => void
}

export const AccountList = (props: Props) => {
  const {accounts, onSelect} = props

  return (
    <>
      {accounts.map(account => (
        <IonItem onClick={() => onSelect(account.id)}>
          {account.name}
        </IonItem>
      ))}
    </>
  )
}