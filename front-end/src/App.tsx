import { IonApp, IonRoute, IonRouterOutlet, IonSplitPane, setupIonicReact } from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { Redirect } from "react-router"
import { WithItemTools } from "./components/IconTools"
import Account from "./domain/model/account"
import Category from "./domain/model/category"
import Currency from "./domain/model/currency"
import Transaction from "./domain/model/transaction"
import Menu from "./components/Menu"
import { FC, ReactNode, useEffect, useState } from "react"
import CategoryPage from "./pages/CategoryPage"
import CreateCategoryPage from "./pages/CreateCategoryPage"
import EditCategoryPage from "./pages/EditCategoryPage"
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
  CategoryPersistenceContext,
  CurrencyServiceContext,
  TransactionServiceContext,
} from "./service/ServiceContext"

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
import TransactionRemoteStore from "./store/remote/TransactionRemoteStore"

setupIonicReact()

// const CategoryPage = lazy(() => import("./pages/CategoryPage"))
// const UnimplementedPage = lazy(() => import("./pages/UnimplementedPage"))
// const TransactionPage = lazy(() => import("./pages/TransactionPage"))
// const ImportSpreadsheet = lazy(() => import("./pages/ImportSpreadsheet"))

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

  if (currencies === null || categories === null || accounts === null || transactions === null) {
    return null
  }

  const StateWrapper: FC<{children: ReactNode | ReactNode[]}> = ({children}) => (
    <BasicCrudServiceWithPersistence
      initialState={currencies}
      longTermStore={currencyStore}
      context={CurrencyServiceContext}
      Augmenter={NilPersistenceAugmenter}
    >
      <BasicCrudServiceWithPersistence
        initialState={categories}
        longTermStore={categoryStore}
        context={CategoryPersistenceContext}
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
          >
            <WithItemTools>
              {children}
            </WithItemTools>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  )

  return (
    <IonApp>
      <IonReactRouter>
        <StateWrapper>
          <IonSplitPane contentId="main">
            <Menu/>

            <IonRouterOutlet id="main">
              <IonRoute exact path="/categories" render={() => <CategoryPage/>}/>
              <IonRoute exact path="/categories/new" render={() => <CreateCategoryPage/>}/>
              <IonRoute exact path="/categories/edit/:categoryId" render={() => <EditCategoryPage/>}/>
              <IonRoute exact path="/currencies" render={() => <UnimplementedPage/>}/>
              <IonRoute exact path="/transactions" render={() => <TransactionPage/>}/>
              <IonRoute exact path="/import" render={() => <ImportSpreadsheet/>}/>
              <IonRoute exact path="/" render={() => <Redirect to="/transactions"/>}/>
            </IonRouterOutlet>
          </IonSplitPane>
        </StateWrapper>
      </IonReactRouter>
    </IonApp>
  )
}

export default App
