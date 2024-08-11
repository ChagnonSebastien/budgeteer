import { Transaction } from "../domain/model/transaction"
import { Account } from "../domain/model/account"
import { Category } from "../domain/model/category"
import { Currency } from "../domain/model/currency"
import TransactionCard from "./TransactionCard"

interface Props {
  transactions: Transaction[];
  accounts: Account[]
  category: Category[]
  currency: Currency[],
}

export const TransactionList = (props: Props) => {
  console.log("transaction list")
  return (
    <div style={{overflow: "scroll", height: "50vh"}}>
      {props.transactions.map((transaction: Transaction) => (
        <TransactionCard key={transaction.id}
                         from={props.accounts.find(a => a.id == transaction.sender)?.name ?? "UNKNOWN"}
                         to={props.accounts.find(a => a.id == transaction.receiver)?.name ?? "UNKNOWN"}
                         amount={(transaction.amount / 100)}
                         category={props.category.find(a => a.id == transaction.category)?.name ?? "UNKNOWN"}
                         date={transaction.date}
                         currencySymbol={props.currency.find(c => c.id == transaction.currency)?.symbol ?? "UNKNOWN"}
                         note={transaction.note}
        />
      ))}
    </div>
  )
}