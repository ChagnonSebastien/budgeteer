import { IonPage, IonSpinner } from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { TransactionList } from "../components/TransactionList"
import { AugmentedTransaction } from "../domain/model/transaction"
import {
  AccountServiceContext,
  CategoryPersistenceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "../service/ServiceContext"

const TransactionPage: FC = () => {
  const {state: transactions} = useContext(TransactionServiceContext)
  const {state: currencies} = useContext(CurrencyServiceContext)
  const {state: categories} = useContext(CategoryPersistenceContext)
  const {state: accounts} = useContext(AccountServiceContext)

  const augmentedTransaction = useMemo<AugmentedTransaction[]>(() => {
    return transactions.map<AugmentedTransaction>(transaction => ({
      ...transaction,
      category: categories.find(c => c.id === transaction.categoryId)!,
      currency: currencies.find(c => c.id === transaction.currencyId)!,
      sender: accounts.find(c => c.id === transaction.senderId),
      receiver: accounts.find(c => c.id === transaction.receiverId),
    }))
  }, [transactions, currencies, categories, accounts])

  let contents
  if (typeof augmentedTransaction === "undefined") {
    contents = <IonSpinner/>
  } else {
    contents = <TransactionList transactions={augmentedTransaction}/>
  }

  return (
    <IonPage>
      <ContentWithHeader title="Transactions" button="menu">
        {contents}
      </ContentWithHeader>
    </IonPage>
  )
}

export default TransactionPage
