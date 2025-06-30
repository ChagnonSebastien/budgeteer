import { CircularProgress } from '@mui/material'
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import React, { FC, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { UserContext } from './App'
import ContentWithHeader from './components/ContentWithHeader'
import CurrencyForm from './components/currencies/CurrencyForm'
import DrawerWrapper from './components/Menu'
import { CurrencyUpdatableFields, RateAutoupdateSettings } from './domain/model/currency'
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
import IndexedDB from './store/local/indexedDb/db'
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

interface Props {
  logout(): void
  hasInternet: boolean
  setDefaultCurrency(id: number): void
}

const AuthenticatedZone: FC<Props> = (props) => {
  const { logout, hasInternet, setDefaultCurrency } = props

  const testGetRateScript = useMemo(() => exchangeRateRemoteStore.testGetRateScript(), [])

  const WaitOnDefaultCurrency: FC = () => (
    <BrowserRouter>
      <CurrencyServiceContext.Consumer>
        {(currencyContext) =>
          !currencyContext.tentativeDefaultCurrency ? (
            <UserContext.Consumer>
              {(user) =>
                user.default_currency === null ? (
                  <MustBeConnectedToInternetOnFirstSetup>
                    <ContentWithHeader title="What's your main currency?" button="none">
                      <div style={{ padding: '1rem' }}>
                        <CurrencyForm
                          onSubmit={async (currencyData: Partial<CurrencyUpdatableFields>) => {
                            if (typeof currencyData.name === 'undefined') return
                            if (typeof currencyData.symbol === 'undefined') return
                            if (typeof currencyData.decimalPoints === 'undefined') return

                            const newCurrency = await currencyContext.create({
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
                  <CircularProgress />
                )
              }
            </UserContext.Consumer>
          ) : (
            <WaitOnAtLeastOneCategory>
              <MixedAugmentationProvider>
                <DrawerWrapper logout={logout}>
                  <Routes>
                    <Route path="/currencies" element={<CurrenciesPage />} />
                    <Route path="/currencies/new" element={<CreateCurrencyPage scriptRunner={testGetRateScript} />} />
                    <Route
                      path="/currencies/edit/:currencyId"
                      element={<EditCurrencyPage scriptRunner={testGetRateScript} />}
                    />
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
              </MixedAugmentationProvider>
            </WaitOnAtLeastOneCategory>
          )
        }
      </CurrencyServiceContext.Consumer>
    </BrowserRouter>
  )

  const MustBeConnectedToInternetOnFirstSetup: FC<{ children: React.JSX.Element }> = ({ children }) =>
    hasInternet ? children : <div className="centered">Internet connection required on first use</div>

  const WaitOnAtLeastOneCategory: FC<{ children: React.JSX.Element }> = ({ children }) => (
    <CategoryServiceContext.Consumer>
      {(value) =>
        value.augmentedCategories.length === 0 ? (
          <MustBeConnectedToInternetOnFirstSetup>
            <CircularProgress />
          </MustBeConnectedToInternetOnFirstSetup>
        ) : (
          children
        )
      }
    </CategoryServiceContext.Consumer>
  )

  const WaitOnInitializedData: FC<{ children: React.JSX.Element }> = ({ children }) => (
    <TransactionServiceContext.Consumer>
      {(value) =>
        !value.initialized ? (
          <CircularProgress />
        ) : (
          <ExchangeRateServiceContext.Consumer>
            {(value) =>
              !value.initialized ? (
                <CircularProgress />
              ) : (
                <AccountServiceContext.Consumer>
                  {(value) =>
                    !value.initialized ? (
                      <CircularProgress />
                    ) : (
                      <CurrencyServiceContext.Consumer>
                        {(value) =>
                          !value.initialized ? (
                            <CircularProgress />
                          ) : (
                            <CategoryServiceContext.Consumer>
                              {(value) => (!value.initialized ? <CircularProgress /> : children)}
                            </CategoryServiceContext.Consumer>
                          )
                        }
                      </CurrencyServiceContext.Consumer>
                    )
                  }
                </AccountServiceContext.Consumer>
              )
            }
          </ExchangeRateServiceContext.Consumer>
        )
      }
    </TransactionServiceContext.Consumer>
  )

  return (
    <BasicCrudServiceWithPersistence
      itemName="Currency"
      synced={true}
      initialState={[]}
      longTermStore={currencyRemoteStore}
      localStore={currencyLocalStore}
      actionStore={replayStore}
      context={CurrencyServiceContext}
      Augmenter={CurrencyPersistenceAugmenter}
      hasInternet={hasInternet}
      sorter={(a, b) => b.id - a.id}
    >
      <BasicCrudServiceWithPersistence
        itemName="Category"
        synced={true}
        initialState={[]}
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
          itemName="Account"
          synced={true}
          initialState={[]}
          longTermStore={accountRemoteStore}
          localStore={accountLocalStore}
          actionStore={replayStore}
          context={AccountServiceContext}
          Augmenter={AccountPersistenceAugmenter}
          hasInternet={hasInternet}
          sorter={(a, b) => b.id - a.id}
        >
          <BasicCrudServiceWithPersistence
            itemName="ExcahngeRate"
            synced={true}
            initialState={[]}
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
              itemName="Transaction"
              synced={true}
              initialState={[]}
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
              <WaitOnInitializedData>
                <WaitOnDefaultCurrency />
              </WaitOnInitializedData>
            </BasicCrudServiceWithPersistence>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  )
}

export default AuthenticatedZone
