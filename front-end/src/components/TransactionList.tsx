import { AugmentedTransaction } from "../domain/model/transaction"
import TransactionCard from "./TransactionCard"

interface Props {
  transactions: AugmentedTransaction[];
}

export const TransactionList = (props: Props) => {
  return (
    <div style={{overflow: "scroll"}}>
      {props.transactions.map(transaction => (
        <TransactionCard key={transaction.id}
                         from={transaction.sender?.name ?? "-"}
                         to={transaction.receiver?.name ?? "-"}
                         amount={(transaction.amount / 100)}
                         category={transaction.category.name}
                         date={transaction.date}
                         currencySymbol={transaction.currency.symbol}
                         note={transaction.note ?? ""}
        />
      ))}
    </div>
  )
}