import { IonInfiniteScroll, IonInfiniteScrollContent } from "@ionic/react"
import { useMemo, useState } from "react"
import { AugmentedTransaction } from "../domain/model/transaction"
import TransactionCard from "./TransactionCard"

interface Props {
  transactions: AugmentedTransaction[],
  onClick: (transactionId: number) => void
}

const chunkSize = 50

export const TransactionList = (props: Props) => {
  const {transactions, onClick} = props

  const [displayedAmount, setDisplayedAmount] = useState<number>(chunkSize)

  const displayedItems = useMemo(() => transactions.slice(0, displayedAmount), [transactions, displayedAmount])

  return (
    <>
      {displayedItems.map(transaction => (
        <TransactionCard key={transaction.id}
                         onClick={() => onClick(transaction.id)}
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