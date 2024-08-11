import { IonApp, IonRoute, IonRouterOutlet, IonSplitPane, setupIonicReact } from "@ionic/react"
import { IonReactRouter } from "@ionic/react-router"
import { Redirect } from "react-router"
import Account from "./domain/model/account"
import Category from "./domain/model/category"
import Currency from "./domain/model/currency"
import Transaction from "./domain/model/transaction"
import ImportSpreadsheet from "./pages/ImportSpreadsheet"
import Menu from "./components/Menu"
import Page from "./pages/Page"

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
import { FC, ReactNode, useContext, useEffect, useState } from "react"
import TransactionPage from "./pages/TransactionPage"
import {
  AccountPersistenceContext,
  AccountRepositoryContext, CategoryPersistenceContext,
  CategoryRepositoryContext, CurrencyPersistenceContext,
  CurrencyRepositoryContext, TransactionPersistenceContext, TransactionRepositoryContext,
} from "./service/RepositoryContexts"

setupIonicReact()

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
            {children}
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
              <IonRoute path="/categories" render={() => <Page/>}/>
              <IonRoute path="/currencies" render={() => <Page/>}/>
              <IonRoute path="/transactions" render={() => <TransactionPage/>}/>
              <IonRoute path="/import" render={() => <ImportSpreadsheet/>}/>
              <IonRoute path="/" exact render={() => <Redirect to="/transactions"/>}/>
            </IonRouterOutlet>
          </IonSplitPane>
        </StateWrapper>
      </IonReactRouter>
    </IonApp>
  )
}

export default App
