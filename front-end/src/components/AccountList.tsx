import { IonItem } from "@ionic/react"
import { useContext } from "react"
import Account from "../domain/model/account"
import MixedAugmentation from "../service/MixedAugmentation"
import { CurrencyServiceContext } from "../service/ServiceContext"

interface Props {
  accounts: Account[],
  onSelect: (value: number) => void,
  showBalances?: boolean,
}

export const AccountList = (props: Props) => {
  const {accounts, onSelect, showBalances = false} = props
  const {accountBalances} = useContext(MixedAugmentation)

  const {state: currencies} = useContext(CurrencyServiceContext)

  return (
    <>
      {accounts.map(account => {
        return (
          <IonItem key={`account-list-${account.id}`} onClick={() => onSelect(account.id)}>
            <div style={{flexGrow: 1}}>
              <div>
                {account.name}
              </div>
              {showBalances && [...(accountBalances?.get(account.id)?.entries() ?? [])].map((entry) => {
                const currency = currencies.find(c => c.id === entry[0])
                return (
                  <div key={`currency-in-account-${entry[0]}`} style={{textAlign: "right"}}>
                    {entry[1] / Math.pow(10, currency?.decimalPoints ?? 2)} {currency?.symbol ?? entry[0]}
                  </div>
                )
              })}
            </div>
          </IonItem>
        )
      })}
    </>
  )
}