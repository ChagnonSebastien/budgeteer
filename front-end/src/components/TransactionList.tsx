import { IonButton, IonFab, IonFabButton, IonFabList, IonInfiniteScroll, IonInfiniteScrollContent } from "@ionic/react"
import { useContext, useMemo, useState } from "react"
import { AugmentedTransaction } from "../domain/model/transaction"
import { IconToolsContext } from "./IconTools"
import TransactionCard from "./TransactionCard"

interface Props {
  transactions: AugmentedTransaction[];
}

const chunkSize = 50

export const TransactionList = (props: Props) => {
  const {transactions} = props

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)
  const {iconTypeFromName} = useContext(IconToolsContext)

  const displayedItems = useMemo(() => transactions.slice(0, displayedAmount), [transactions, displayedAmount])

  const FaPlus = useMemo(() => iconTypeFromName("FaPlus"), [iconTypeFromName])
  const GrTransaction = useMemo(() => iconTypeFromName("GrTransaction"), [iconTypeFromName])
  const MdOutput = useMemo(() => iconTypeFromName("MdOutput"), [iconTypeFromName])
  const MdInput = useMemo(() => iconTypeFromName("MdInput"), [iconTypeFromName])

  return (
    <>
      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton>
          <FaPlus/>
        </IonFabButton>
        <IonFabList side="top">
          <IonFabButton color="success">
            <MdInput/>
          </IonFabButton>
          <IonFabButton color="danger">
            <MdOutput/>
          </IonFabButton>
          <IonFabButton color="dark">
            <GrTransaction/>
          </IonFabButton>
        </IonFabList>
      </IonFab>

      {displayedItems.map(transaction => (
        <TransactionCard key={transaction.id}
                         from={transaction.sender?.name ?? "-"}
                         to={transaction.receiver?.name ?? "-"}
                         amount={(transaction.amount / 100)}
                         categoryIconName={transaction.category.iconName}
                         date={transaction.date}
                         currencySymbol={transaction.currency.symbol}
                         note={transaction.note ?? ""}
                         categoryIconColor={transaction.category.iconColor}
                         categoryIconBackground={transaction.category.iconBackground}

        />
      ))}
      <IonInfiniteScroll
        onIonInfinite={(ev) => {
          setDisplayedAmount(prevState => prevState + chunkSize)
          setTimeout(() => ev.target.complete(), 500)
        }}
      >
        <IonInfiniteScrollContent></IonInfiniteScrollContent>
      </IonInfiniteScroll>
    </>
  )
}