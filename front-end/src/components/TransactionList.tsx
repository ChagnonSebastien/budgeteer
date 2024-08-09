import {Transaction} from "../domain/model/transaction";
import {TransactionServiceClient} from "../messaging/dto/transaction.client";
import {GrpcWebFetchTransport} from "@protobuf-ts/grpcweb-transport";
import {Account} from "../domain/model/account";
import {Category} from "../domain/model/category";
import {Currency} from "../domain/model/currency";

interface Props {
    transactions: Transaction[];
    accounts: Account[]
    category: Category[]
    currency: Currency[],
}

export const TransactionList = (props: Props) => {
    return (
        <div style={{overflow: "scroll", height: "50vh"}}>
            {props.transactions.map((transaction: Transaction) => (
                <div key={transaction.id}>
                    {(transaction.amount / 100).toFixed(2)}$ sent
                    from {props.accounts.find(a => a.id == transaction.sender)?.name ?? "UNKNOWN"} to {props.accounts.find(a => a.id == transaction.receiver)?.name ?? "UNKNOWN"} for {props.category.find(a => a.id == transaction.category)?.name} on {transaction.date.toLocaleDateString()}
                </div>
            ))}
        </div>
    )
}