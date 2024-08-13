import { IonApp, IonRoute, IonRouterOutlet, IonSplitPane, setupIonicReact } from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { Redirect } from "react-router"
import { WithItemTools } from "./components/IconTools"
import Account from "./domain/model/account"
import Category from "./domain/model/category"
import Currency from "./domain/model/currency"
import Transaction from "./domain/model/transaction"
import Menu from "./components/Menu"
import { FC, ReactNode, useContext, useEffect, useState, lazy } from "react"
import CategoryPage from "./pages/CategoryPage"
import CreateCategoryPage from "./pages/CreateCategoryPage"
import ImportSpreadsheet from "./pages/ImportSpreadsheet"
import TransactionPage from "./pages/TransactionPage"
import UnimplementedPage from "./pages/UnimplementedPage"
import {
  AccountPersistenceContext,
  AccountRepositoryContext, CategoryPersistenceContext,
  CategoryRepositoryContext, CurrencyPersistenceContext,
  CurrencyRepositoryContext, TransactionPersistenceContext, TransactionRepositoryContext,
} from "./service/RepositoryContexts"

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

setupIonicReact()

// const CategoryPage = lazy(() => import("./pages/CategoryPage"))
// const UnimplementedPage = lazy(() => import("./pages/UnimplementedPage"))
// const TransactionPage = lazy(() => import("./pages/TransactionPage"))
// const ImportSpreadsheet = lazy(() => import("./pages/ImportSpreadsheet"))

const App: FC = () => {
  const [currencies, setCurrencies] = useState<Currency[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  const currencyRepository = useContext(CurrencyRepositoryContext)
  const categoryRepository = useContext(CategoryRepositoryContext)
  const accountRepository = useContext(AccountRepositoryContext)
  const transactionRepository = useContext(TransactionRepositoryContext)

  useEffect(() => {
    currencyRepository.getAll().then(setCurrencies)
    categoryRepository.getAll().then(setCategories)
    accountRepository.getAll().then(setAccounts)
    transactionRepository.getAll().then(setTransactions)
  }, [])

  const StateWrapper: FC<{children: ReactNode | ReactNode[]}> = ({children}) => (
    <CurrencyPersistenceContext.Provider value={{state: currencies}}>
      <CategoryPersistenceContext.Provider value={{state: categories}}>
        <AccountPersistenceContext.Provider value={{state: accounts}}>
          <TransactionPersistenceContext.Provider value={{state: transactions}}>
            <WithItemTools>
              {children}
            </WithItemTools>
          </TransactionPersistenceContext.Provider>
        </AccountPersistenceContext.Provider>
      </CategoryPersistenceContext.Provider>
    </CurrencyPersistenceContext.Provider>
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
