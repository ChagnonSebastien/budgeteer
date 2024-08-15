import {
  IonApp,
  IonLoading, IonRedirect,
  IonRoute,
  IonRouterOutlet,
  IonSplitPane,
  setupIonicReact,
} from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { Redirect, Route, Switch } from "react-router"
import { WithItemTools } from "./components/IconTools"
import Account from "./domain/model/account"
import Category from "./domain/model/category"
import Currency from "./domain/model/currency"
import Transaction from "./domain/model/transaction"
import Menu from "./components/Menu"
import { FC, useEffect, useState } from "react"
import CategoryPage from "./pages/CategoryPage"
import CreateCategoryPage from "./pages/CreateCategoryPage"
import CreateTransactionPage from "./pages/CreateTransactionPage"
import EditCategoryPage from "./pages/EditCategoryPage"
import EditTransactionPage from "./pages/EditTransactionPage"
import ImportSpreadsheet from "./pages/ImportSpreadsheet"
import TransactionPage from "./pages/TransactionPage"
import UnimplementedPage from "./pages/UnimplementedPage"
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

/* Core CSS required for Ionic components to work properly */
import "@ionic/react/css/core.css"

/* Basic CSS for apps built with Ionic */
import "@ionic/react/css/normalize.css"
import "@ionic/react/css/structure.css"
import "@ionic/react/css/typography.css"

/* Optional CSS utils that can be commented out */
import "@ionic/react/css/padding.css"
import "@ionic/react/css/float-elements.css"
import "@ionic/react/css/text-alignment.css"
import "@ionic/react/css/text-transformation.css"
import "@ionic/react/css/flex-utils.css"
import "@ionic/react/css/display.css"

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* import '@ionic/react/css/palettes/dark.always.css'; */
/* import '@ionic/react/css/palettes/dark.class.css'; */
import "@ionic/react/css/palettes/dark.system.css"

/* Theme variables */
import "./theme/variables.css"
import WithLogin from "./WithLogin"

setupIonicReact()

const transport = new GrpcWebFetchTransport({
  baseUrl: import.meta.env.VITE_BACKEND_URL || "/",
})

const App: FC = () => {
  const [currencies, setCurrencies] = useState<Currency[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  const [currencyStore] = useState(new CurrencyRemoteStore(transport))
  const [categoryStore] = useState(new CategoryRemoteStore(transport))
  const [accountRepository] = useState(new AccountRemoteStore(transport))
  const [transactionRepository] = useState(new TransactionRemoteStore(transport))

  useEffect(() => {
    currencyStore.getAll().then(setCurrencies)
    categoryStore.getAll().then(setCategories)
    accountRepository.getAll().then(setAccounts)
    transactionRepository.getAll().then(setTransactions)
  }, [])

  let contents = <IonLoading/>
  if (!(currencies === null || categories === null || accounts === null || transactions === null)) {
    contents = (
      <BasicCrudServiceWithPersistence
        initialState={currencies}
        longTermStore={currencyStore}
        context={CurrencyServiceContext}
        Augmenter={NilPersistenceAugmenter}
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
            Augmenter={NilPersistenceAugmenter}
          >
            <BasicCrudServiceWithPersistence
              initialState={transactions}
              longTermStore={transactionRepository}
              context={TransactionServiceContext}
              Augmenter={NilPersistenceAugmenter}
              sorter={(a, b) => b.date.getTime() - a.date.getTime()}
            >
              <IonReactRouter>
                <IonSplitPane contentId="main">
                  <Menu/>

                  <IonRouterOutlet id="main">
                    <Switch>
                      <Route exact path="/categories" render={() => <CategoryPage/>}/>
                      <Route exact path="/categories/new" render={() => <CreateCategoryPage/>}/>
                      <Route exact path="/categories/edit/:categoryId" render={() => <EditCategoryPage/>}/>
                      <Route exact path="/currencies" render={() => <UnimplementedPage/>}/>
                      <Route exact path="/transactions" render={() => <TransactionPage/>}/>
                      <Route exact path="/transactions/new" render={() => <CreateTransactionPage/>}/>
                      <Route exact path="/transactions/edit/:transactionId" render={() => <EditTransactionPage/>}/>
                      <Route exact path="/import" render={() => <ImportSpreadsheet/>}/>
                      <Route render={() => (<Redirect to="/transactions"/>)}/>
                    </Switch>
                  </IonRouterOutlet>
                </IonSplitPane>
              </IonReactRouter>
            </BasicCrudServiceWithPersistence>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    )
  }

  return (
    <IonApp>
      <WithItemTools>
        <WithLogin>
          {contents}
        </WithLogin>
      </WithItemTools>
    </IonApp>
  )
}

export default App
