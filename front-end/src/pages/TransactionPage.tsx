import { IonPage, IonSpinner } from "@ionic/react"
import { FC, useContext, useMemo } from "react"
import ContentWithHeader from "../components/ContentWithHeader"
import { TransactionList } from "../components/TransactionList"
import { AugmentedTransaction } from "../domain/model/transaction"
import {
  AccountPersistenceContext,
  CategoryPersistenceContext, CurrencyPersistenceContext,
  TransactionPersistenceContext,
} from "../service/RepositoryContexts"

const TransactionPage: FC = () => {
  const {state: transactions} = useContext(TransactionPersistenceContext)
  const {state: currencies} = useContext(CurrencyPersistenceContext)
  const {state: categories} = useContext(CategoryPersistenceContext)
  const {state: accounts} = useContext(AccountPersistenceContext)

  const augmentedTransaction = useMemo<AugmentedTransaction[] | undefined>(() => {
    if (transactions === null) return
    if (currencies === null) return
    if (categories === null) return
    if (accounts === null) return

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
