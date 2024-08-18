import { IonItem } from "@ionic/react"
import { useContext } from "react"
import Account from "../domain/model/account"
import { CurrencyServiceContext } from "../service/ServiceContext"

interface Props {
  accounts: Account[],
  onSelect: (value: number) => void,
  valuePerAccount?: Map<number, Map<number, number>>
}

export const AccountList = (props: Props) => {
  const {accounts, onSelect, valuePerAccount} = props

  const {state: currencies} = useContext(CurrencyServiceContext)

  return (
    <>
      {accounts.map(account => (
        <IonItem key={`account-list-${account.id}`} onClick={() => onSelect(account.id)}>
          <div style={{flexGrow: 1}}>
            <div>
              {account.name}
            </div>
            {[...(valuePerAccount?.get(account.id)?.entries() ?? [])].map((entry) => (
              <div key={`currency-in-account-${entry[0]}`} style={{textAlign: "right"}}>
                {entry[1] / 100} {currencies.find(c => c.id === entry[0])?.symbol ?? entry[0]}
              </div>
            ))}
          </div>
        </IonItem>
      ))}
    </>
  )
}