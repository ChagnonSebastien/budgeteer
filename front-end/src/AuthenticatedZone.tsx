import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import React, { FC, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { UserContext } from './App'
import ContentWithHeader from './components/ContentWithHeader'
import CurrencyForm from './components/currencies/CurrencyForm'
import LoadingScreen from './components/LoadingScreen'
import DrawerWrapper from './components/Menu'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from './domain/model/currency'
import { IdIdentifier } from './domain/model/Unique'
import AccountsBalancePage from './pages/AccountsBalancePage'
import AccountsPage from './pages/AccountsPage'
import CategoryPage from './pages/CategoryPage'
import CostsAnalysisPage from './pages/CostsAnalysisPage'
import CreateAccountPage from './pages/CreateAccountPage'
import CreateCategoryPage from './pages/CreateCategoryPage'
import CreateCurrencyPage from './pages/CreateCurrencyPage'
import CreateTransactionPage from './pages/CreateTransactionPage'
import CurrenciesPage from './pages/CurrenciesPage'
import EditAccountPage from './pages/EditAccountPage'
import EditCategoryPage from './pages/EditCategoryPage'
import EditCurrencyPage from './pages/EditCurrencyPage'
import EditTransactionPage from './pages/EditTransactionPage'
import TransactionPage from './pages/TransactionPage'
import TrendsPage from './pages/TrendsPage'
import { AccountPersistenceAugmenter } from './service/AccountServiceAugmenter'
import { BasicCrudServiceWithPersistence } from './service/BasicCrudServiceWithPersistence'
import { CategoryPersistenceAugmenter } from './service/CategoryServiceAugmenter'
import { CurrencyPersistenceAugmenter } from './service/CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmenter } from './service/ExcahngeRateServiceAugmenter'
import { MixedAugmentationProvider } from './service/MixedAugmentation'
import { NilPersistenceAugmenter } from './service/NilAugmenter'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  TransactionServiceContext,
} from './service/ServiceContext'
import AccountLocalStore from './store/local/AccountLocalStore'
import CategoryLocalStore from './store/local/CategoryLocalStore'
import CurrencyLocalStore from './store/local/CurrencyLocalStore'
import ExchangeRateLocalStore from './store/local/ExchangeRateLocalStore'
import IndexedDB from './store/local/IndexedDB'
import ReplayStore from './store/local/ReplayStore'
import TransactionLocalStore from './store/local/TransactionLocalStore'
import AccountRemoteStore from './store/remote/AccountRemoteStore'
import CategoryRemoteStore from './store/remote/CategoryRemoteStore'
import CurrencyRemoteStore from './store/remote/CurrencyRemoteStore'
import ExchangeRateRemoteStore from './store/remote/ExchangeRateRemoteStore'
import TransactionRemoteStore from './store/remote/TransactionRemoteStore'

const transport = new GrpcWebFetchTransport({
  baseUrl: import.meta.env.VITE_BACKEND_URL || '/',
  fetchInit: { credentials: 'include' },
})

const currencyRemoteStore = new CurrencyRemoteStore(transport)
const categoryRemoteStore = new CategoryRemoteStore(transport)
const accountRemoteStore = new AccountRemoteStore(transport)
const transactionRemoteStore = new TransactionRemoteStore(transport)
const exchangeRateRemoteStore = new ExchangeRateRemoteStore(transport)

const currencyLocalStore = new CurrencyLocalStore(IndexedDB)
const categoryLocalStore = new CategoryLocalStore(IndexedDB)
const accountLocalStore = new AccountLocalStore(IndexedDB)
const transactionLocalStore = new TransactionLocalStore(IndexedDB)
const exchangeRateLocalStore = new ExchangeRateLocalStore(IndexedDB)
const replayStore = new ReplayStore(IndexedDB)

const MustBeConnectedToInternetOnFirstSetup: FC<{ children: React.JSX.Element; hasInternet: boolean }> = ({
  children,
  hasInternet,
}) => (hasInternet ? children : <div className="centered">Internet connection required on first use</div>)

const CreateDefaultCurrency: FC<{
  create: (data: CurrencyUpdatableFields, identity?: IdIdentifier) => Promise<Currency>
  hasInternet: boolean
  setDefaultCurrency(id: number): void
  testGetRateScript(script: string): Promise<string>
}> = ({ create, hasInternet, setDefaultCurrency, testGetRateScript }) => {
  return (
    <UserContext.Consumer>
      {(user) =>
        user.default_currency === null ? (
          <MustBeConnectedToInternetOnFirstSetup hasInternet={hasInternet}>
            <ContentWithHeader title="What's your main currency?" button="none">
              <div style={{ padding: '1rem' }}>
                <CurrencyForm
                  onSubmit={async (currencyData: Partial<CurrencyUpdatableFields>) => {
                    if (typeof currencyData.name === 'undefined') return
                    if (typeof currencyData.symbol === 'undefined') return
                    if (typeof currencyData.decimalPoints === 'undefined') return

                    const newCurrency = await create({
                      name: currencyData.name,
                      symbol: currencyData.symbol,
                      decimalPoints: currencyData.decimalPoints,
                      rateAutoupdateSettings: new RateAutoupdateSettings('', false),
                    })
                    await currencyRemoteStore.setDefault(newCurrency.id)
                    setDefaultCurrency(newCurrency.id)
                  }}
                  submitText="Create"
                  scriptRunner={testGetRateScript}
                />
              </div>
            </ContentWithHeader>
          </MustBeConnectedToInternetOnFirstSetup>
        ) : (
          <LoadingScreen />
        )
      }
    </UserContext.Consumer>
  )
}

const WaitOnAtLeastOneCategory: FC<{ NextComponent: FC; hasInternet: boolean }> = ({ NextComponent, hasInternet }) => (
  <CategoryServiceContext.Consumer>
    {(value) =>
      value.augmentedCategories.length === 0 ? (
        <MustBeConnectedToInternetOnFirstSetup hasInternet={hasInternet}>
          <LoadingScreen />
        </MustBeConnectedToInternetOnFirstSetup>
      ) : (
        <NextComponent />
      )
    }
  </CategoryServiceContext.Consumer>
)

const AssureMinimumConfig: FC<{
  NextComponent: FC
  hasInternet: boolean
  setDefaultCurrency(id: number): void
  testGetRateScript(script: string): Promise<string>
}> = ({ NextComponent, hasInternet, setDefaultCurrency, testGetRateScript }) => (
  <BrowserRouter>
    <CurrencyServiceContext.Consumer>
      {(currencyContext) =>
        !currencyContext.tentativeDefaultCurrency ? (
          <CreateDefaultCurrency
            create={currencyContext.create}
            setDefaultCurrency={setDefaultCurrency}
            hasInternet={hasInternet}
            testGetRateScript={testGetRateScript}
          />
        ) : (
          <WaitOnAtLeastOneCategory NextComponent={NextComponent} hasInternet={hasInternet} />
        )
      }
    </CurrencyServiceContext.Consumer>
  </BrowserRouter>
)

const WaitOnInitializedData: FC<{
  NextComponent: FC
  hasInternet: boolean
  setDefaultCurrency(id: number): void
  testGetRateScript(script: string): Promise<string>
}> = ({ NextComponent, hasInternet, setDefaultCurrency, testGetRateScript }) => (
  <TransactionServiceContext.Consumer>
    {(transactionCtx) => (
      <ExchangeRateServiceContext.Consumer>
        {(exchangeRateCtx) => (
          <AccountServiceContext.Consumer>
            {(accountCtx) => (
              <CurrencyServiceContext.Consumer>
                {(currencyCtx) => (
                  <CategoryServiceContext.Consumer>
                    {(categoryCtx) =>
                      !transactionCtx.initialized ||
                      !exchangeRateCtx.initialized ||
                      !exchangeRateCtx.version != !exchangeRateCtx.augmentedVersion ||
                      !accountCtx.initialized ||
                      !accountCtx.version != !accountCtx.augmentedVersion ||
                      !currencyCtx.initialized ||
                      !currencyCtx.version != !currencyCtx.augmentedVersion ||
                      !categoryCtx.initialized ||
                      !categoryCtx.version != !categoryCtx.augmentedVersion ? (
                        <LoadingScreen />
                      ) : (
                        <AssureMinimumConfig
                          NextComponent={NextComponent}
                          setDefaultCurrency={setDefaultCurrency}
                          hasInternet={hasInternet}
                          testGetRateScript={testGetRateScript}
                        />
                      )
                    }
                  </CategoryServiceContext.Consumer>
                )}
              </CurrencyServiceContext.Consumer>
            )}
          </AccountServiceContext.Consumer>
        )}
      </ExchangeRateServiceContext.Consumer>
    )}
  </TransactionServiceContext.Consumer>
)

const PersistenceSetup: FC<{ children: React.JSX.Element; hasInternet: boolean }> = ({ children, hasInternet }) => (
  <BasicCrudServiceWithPersistence
    itemName="category"
    synced={true}
    longTermStore={currencyRemoteStore}
    localStore={currencyLocalStore}
    actionStore={replayStore}
    context={CurrencyServiceContext}
    Augmenter={CurrencyPersistenceAugmenter}
    hasInternet={hasInternet}
    sorter={(a, b) => b.id - a.id}
  >
    <BasicCrudServiceWithPersistence
      itemName="category"
      synced={true}
      longTermStore={categoryRemoteStore}
      localStore={categoryLocalStore}
      actionStore={replayStore}
      context={CategoryServiceContext}
      Augmenter={CategoryPersistenceAugmenter}
      sorter={(a, b) => {
        if (b.ordering !== a.ordering) return b.ordering - a.ordering
        return b.id - a.id
      }}
      hasInternet={hasInternet}
    >
      <BasicCrudServiceWithPersistence
        itemName="account"
        synced={true}
        longTermStore={accountRemoteStore}
        localStore={accountLocalStore}
        actionStore={replayStore}
        context={AccountServiceContext}
        Augmenter={AccountPersistenceAugmenter}
        hasInternet={hasInternet}
        sorter={(a, b) => b.id - a.id}
      >
        <BasicCrudServiceWithPersistence
          itemName="exchangeRate"
          synced={true}
          longTermStore={exchangeRateRemoteStore}
          localStore={exchangeRateLocalStore}
          actionStore={replayStore}
          context={ExchangeRateServiceContext}
          Augmenter={ExchangeRatePersistenceAugmenter}
          hasInternet={hasInternet}
          sorter={(a, b) => {
            if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
            if (b.currencyA !== a.currencyA) return b.currencyA - a.currencyA
            return b.currencyB - a.currencyB
          }}
        >
          <BasicCrudServiceWithPersistence
            itemName="transaction"
            synced={true}
            longTermStore={transactionRemoteStore}
            localStore={transactionLocalStore}
            actionStore={replayStore}
            context={TransactionServiceContext}
            Augmenter={NilPersistenceAugmenter}
            sorter={(a, b) => {
              if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
              return b.id - a.id
            }}
            hasInternet={hasInternet}
          >
            {children}
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  </BasicCrudServiceWithPersistence>
)

interface Props {
  logout(): void
  hasInternet: boolean
  setDefaultCurrency(id: number): void
}

const AuthenticatedZone: FC<Props> = (props) => {
  const { logout, hasInternet, setDefaultCurrency } = props

  const testGetRateScript = useMemo(() => exchangeRateRemoteStore.testGetRateScript(), [])

  const FullyAugmentedView = useMemo<FC>(
    () => () => (
      <DrawerWrapper logout={logout}>
        <Routes>
          <Route path="/currencies" element={<CurrenciesPage />} />
          <Route path="/currencies/new" element={<CreateCurrencyPage scriptRunner={testGetRateScript} />} />
          <Route path="/currencies/edit/:currencyId" element={<EditCurrencyPage scriptRunner={testGetRateScript} />} />
          <Route path="/categories" element={<CategoryPage />} />
          <Route path="/categories/new" element={<CreateCategoryPage />} />
          <Route path="/categories/edit/:categoryId" element={<EditCategoryPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/new" element={<CreateAccountPage />} />
          <Route path="/accounts/graph" element={<AccountsBalancePage />} />
          <Route path="/accounts/edit/:accountId" element={<EditAccountPage />} />
          <Route path="/transactions" element={<TransactionPage />} />
          <Route path="/transactions/new" element={<CreateTransactionPage />} />
          <Route path="/transactions/edit/:transactionId" element={<EditTransactionPage />} />
          <Route path="/costs" element={<CostsAnalysisPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="*" element={<Navigate to="/transactions" />} />
        </Routes>
      </DrawerWrapper>
    ),
    [logout, testGetRateScript],
  )

  const CompleteView = useMemo<FC>(
    () => () => <MixedAugmentationProvider NextComponent={FullyAugmentedView} />,
    [FullyAugmentedView],
  )

  return (
    <PersistenceSetup hasInternet={hasInternet}>
      <WaitOnInitializedData
        NextComponent={CompleteView}
        setDefaultCurrency={setDefaultCurrency}
        hasInternet={hasInternet}
        testGetRateScript={testGetRateScript}
      />
    </PersistenceSetup>
  )
}

export default AuthenticatedZone
