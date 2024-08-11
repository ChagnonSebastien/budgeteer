import { IonButtons, IonContent, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar } from "@ionic/react"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { FC, useEffect, useState } from "react"
import PageWithHeader from "../components/PageWithHeader"

import { Account } from "../domain/model/account"
import { Category } from "../domain/model/category"
import { Currency } from "../domain/model/currency"
import { Transaction } from "../domain/model/transaction"
import { AccountConverter } from "../messaging/converter/accountConverter"
import { CategoryConverter } from "../messaging/converter/categoryConverter"
import { CurrencyConverter } from "../messaging/converter/currencyConverter"
import { TransactionConverter } from "../messaging/converter/transactionConverter"
import { GetAllAccountsRequest } from "../messaging/dto/account"
import { AccountServiceClient } from "../messaging/dto/account.client"
import { GetAllCategoriesRequest } from "../messaging/dto/category"
import { CategoryServiceClient } from "../messaging/dto/category.client"
import { GetAllCurrenciesRequest } from "../messaging/dto/currency"
import { CurrencyServiceClient } from "../messaging/dto/currency.client"
import { GetAllTransactionsRequest } from "../messaging/dto/transaction"
import { TransactionServiceClient } from "../messaging/dto/transaction.client"
import { TransactionList } from "../components/TransactionList"


const transport = new GrpcWebFetchTransport({
  baseUrl: "http://localhost:8080",
})

const transactionService = new TransactionServiceClient(transport)
const currencyService = new CurrencyServiceClient(transport)
const categoryService = new CategoryServiceClient(transport)
const accountService = new AccountServiceClient(transport)

const TransactionPage: FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  useEffect(() => {
    console.log("fetch all")
    accountService.getAllAccounts(GetAllAccountsRequest.create()).response
      .then(response => {
        const conv = new AccountConverter()
        const list = response.accounts.map<Account>(t => conv.toModel(t))
        setAccounts(list)
      })
    categoryService.getAllCategories(GetAllCategoriesRequest.create()).response
      .then(response => {
        const conv = new CategoryConverter()
        const list = response.categories.map<Category>(t => conv.toModel(t))
        setCategories(list)
      })
    currencyService.getAllCurrencies(GetAllCurrenciesRequest.create()).response
      .then(response => {
        const conv = new CurrencyConverter()
        const list = response.currencies.map<Currency>(t => conv.toModel(t))
        setCurrencies(list)
      })
    transactionService.getAllTransactions(GetAllTransactionsRequest.create()).response
      .then(response => {
        const conv = new TransactionConverter()
        const list = response.transactions.map<Transaction>(t => conv.toModel(t))
        setTransactions(list)
      })
  }, [])

  return (
    <PageWithHeader title="Transactions" button="menu">
      <p>Explore <a target="_blank" rel="noopener noreferrer" href="https://ionicframework.com/docs/components">UI
        Components</a></p>
      <TransactionList transactions={transactions} accounts={accounts} category={categories} currency={currencies}/>
    </PageWithHeader>
  )
}

export default TransactionPage
