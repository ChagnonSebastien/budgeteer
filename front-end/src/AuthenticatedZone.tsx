import {
  IonLoading,
  IonRouterOutlet,
  IonSplitPane,
} from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { Redirect, Route, Switch } from "react-router"
import { UserContext } from "./App"
import ContentWithHeader from "./components/ContentWithHeader"
import CurrencyForm from "./components/CurrencyForm"
import Account from "./domain/model/account"
import Category from "./domain/model/category"
import Currency from "./domain/model/currency"
import Transaction from "./domain/model/transaction"
import Menu from "./components/Menu"
import { FC, useCallback, useContext, useEffect, useState } from "react"
import AccountsPage from "./pages/AccountsPage"
import CategoryPage from "./pages/CategoryPage"
import CreateAccountPage from "./pages/CreateAccountPage"
import CreateCategoryPage from "./pages/CreateCategoryPage"
import CreateCurrencyPage from "./pages/CreateCurrencyPage"
import CreateTransactionPage from "./pages/CreateTransactionPage"
import CurrenciesPage from "./pages/CurrenciesPage"
import EditAccountPage from "./pages/EditAccountPage"
import EditCategoryPage from "./pages/EditCategoryPage"
import EditCurrencyPage from "./pages/EditCurrencyPage"
import EditTransactionPage from "./pages/EditTransactionPage"
import ImportSpreadsheet from "./pages/ImportSpreadsheet"
import TransactionPage from "./pages/TransactionPage"
import { AccountPersistenceAugmenter } from "./service/AccountServiceAugmenter"
import { CurrencyPersistenceAugmenter } from "./service/CurrencyServiceAugmenter"
import { MixedAugmentationProvider } from "./service/MixedAugmentation"
import AccountRemoteStore from "./store/remote/AccountRemoteStore"
import { CategoryPersistenceAugmenter } from "./service/CategoryServiceAugmenter"
import CategoryRemoteStore from "./store/remote/CategoryRemoteStore"
import CurrencyRemoteStore from "./store/remote/CurrencyRemoteStore"
import { NilPersistenceAugmenter } from "./service/NilAugmenter"
import { BasicCrudServiceWithPersistence } from "./service/BasicCrudServiceWithPersistence"
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "./service/ServiceContext"
import TransactionRemoteStore from "./store/remote/TransactionRemoteStore"

const transport = new GrpcWebFetchTransport({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
  fetchInit: {credentials: "include"},
})

const currencyStore = new CurrencyRemoteStore(transport)
const categoryStore = new CategoryRemoteStore(transport)
const accountRepository = new AccountRemoteStore(transport)
const transactionRepository = new TransactionRemoteStore(transport)

interface Props {
  logout(): void

  setDefaultCurrency(id: number): void
}

const AuthenticatedZone: FC<Props> = (props) => {
  const {logout, setDefaultCurrency} = props

  const {default_currency} = useContext(UserContext)

  const [currencies, setCurrencies] = useState<Currency[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  useEffect(() => {
    currencyStore.getAll().then(setCurrencies)
    categoryStore.getAll().then(setCategories)
    accountRepository.getAll().then(setAccounts)
    transactionRepository.getAll().then(setTransactions)
  }, [])

  const onNewCurrency = useCallback(async (data: Omit<Currency, "id">) => {
    if (currencies === null) return

    const newCurrency = await currencyStore.create(data)
    await currencyStore.setDefault(newCurrency.id)
    setCurrencies([...currencies, newCurrency])
    setDefaultCurrency(newCurrency.id)
  }, [currencies])

  if (currencies === null || categories === null || accounts === null || transactions === null) {
    return <IonLoading/>
  }

  if (default_currency === null) {
    return (
      <ContentWithHeader title="What's your main currency?" button="none">
        <div style={{padding: "1rem"}}>
          <CurrencyForm
            onSubmit={onNewCurrency}
            submitText="Create"
          />
        </div>
      </ContentWithHeader>
    )
  }

  return (
    <BasicCrudServiceWithPersistence
      initialState={currencies}
      longTermStore={currencyStore}
      context={CurrencyServiceContext}
      Augmenter={CurrencyPersistenceAugmenter}
    >
      <BasicCrudServiceWithPersistence
        initialState={categories}
        longTermStore={categoryStore}
        context={CategoryServiceContext}
        Augmenter={CategoryPersistenceAugmenter}
      >
        <BasicCrudServiceWithPersistence
          initialState={accounts}
          longTermStore={accountRepository}
          context={AccountServiceContext}
          Augmenter={AccountPersistenceAugmenter}
        >
          <BasicCrudServiceWithPersistence
            initialState={transactions}
            longTermStore={transactionRepository}
            context={TransactionServiceContext}
            Augmenter={NilPersistenceAugmenter}
            sorter={(a, b) => b.date.getTime() - a.date.getTime()}
          >
            <MixedAugmentationProvider>
              <IonReactRouter>
                <IonSplitPane contentId="main">
                  <Menu logout={logout}/>

                  <IonRouterOutlet id="main">
                    <Switch>
                      <Route exact path="/currencies" render={() => <CurrenciesPage/>}/>
                      <Route exact path="/currencies/new" render={() => <CreateCurrencyPage/>}/>
                      <Route exact path="/currencies/edit/:currencyId" render={() => <EditCurrencyPage/>}/>
                      <Route exact path="/categories" render={() => <CategoryPage/>}/>
                      <Route exact path="/categories/new" render={() => <CreateCategoryPage/>}/>
                      <Route exact path="/categories/edit/:categoryId" render={() => <EditCategoryPage/>}/>
                      <Route exact path="/accounts" render={() => <AccountsPage/>}/>
                      <Route exact path="/accounts/new" render={() => <CreateAccountPage/>}/>
                      <Route exact path="/accounts/edit/:accountId" render={() => <EditAccountPage/>}/>
                      <Route exact path="/transactions" render={() => <TransactionPage/>}/>
                      <Route exact path="/transactions/new" render={() => <CreateTransactionPage/>}/>
                      <Route exact path="/transactions/edit/:transactionId" render={() => <EditTransactionPage/>}/>
                      <Route exact path="/import" render={() => <ImportSpreadsheet/>}/>
                      <Route render={() => (<Redirect to="/transactions"/>)}/>
                    </Switch>
                  </IonRouterOutlet>
                </IonSplitPane>
              </IonReactRouter>
            </MixedAugmentationProvider>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  )
}

export default AuthenticatedZone
