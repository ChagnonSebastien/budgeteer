import { CircularProgress } from '@mui/material'
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import { FC, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { UserContext } from './App'
import ContentWithHeader from './components/ContentWithHeader'
import CurrencyForm from './components/currencies/CurrencyForm'
import DrawerWrapper from './components/Menu'
import Account from './domain/model/account'
import Category from './domain/model/category'
import Currency, { CurrencyUpdatableFields } from './domain/model/currency'
import ExchangeRate from './domain/model/exchangeRate'
import Transaction from './domain/model/transaction'
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
import AccountRemoteStore from './store/remote/AccountRemoteStore'
import CategoryRemoteStore from './store/remote/CategoryRemoteStore'
import CurrencyRemoteStore from './store/remote/CurrencyRemoteStore'
import ExchangeRateRemoteStore from './store/remote/ExchangeRateRemoteStore'
import TransactionRemoteStore from './store/remote/TransactionRemoteStore'

const transport = new GrpcWebFetchTransport({
  baseUrl: import.meta.env.VITE_BACKEND_URL || '/',
  fetchInit: { credentials: 'include' },
})

const currencyStore = new CurrencyRemoteStore(transport)
const categoryStore = new CategoryRemoteStore(transport)
const accountStore = new AccountRemoteStore(transport)
const transactionStore = new TransactionRemoteStore(transport)
const exchangeRateStore = new ExchangeRateRemoteStore(transport)

interface Props {
  logout(): void

  setDefaultCurrency(id: number): void
}

const AuthenticatedZone: FC<Props> = (props) => {
  const { logout, setDefaultCurrency } = props

  const { default_currency } = useContext(UserContext)

  const [currencies, setCurrencies] = useState<Currency[] | null>(null)
  const [categories, setCategories] = useState<Category[] | null>(null)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[] | null>(null)
  const testGetRateScript = useMemo(() => exchangeRateStore.testGetRateScript(), [])

  useEffect(() => {
    currencyStore.getAll().then(setCurrencies)
    categoryStore.getAll().then(setCategories)
    accountStore.getAll().then(setAccounts)
    transactionStore.getAll().then(setTransactions)
    exchangeRateStore.getAll().then(setExchangeRates)
  }, [])

  const onNewCurrency = useCallback(
    async (currencyData: Partial<CurrencyUpdatableFields>) => {
      if (currencies === null) return

      if (typeof currencyData.name === 'undefined') return
      if (typeof currencyData.symbol === 'undefined') return
      if (typeof currencyData.decimalPoints === 'undefined') return

      const newCurrency = await currencyStore.create({
        name: currencyData.name,
        symbol: currencyData.symbol,
        decimalPoints: currencyData.decimalPoints,
        rateAutoupdateSettings: {
          script: '',
          enabled: false,
        },
      })
      await currencyStore.setDefault(newCurrency.id)
      setCurrencies([...currencies, newCurrency])
      setDefaultCurrency(newCurrency.id)
    },
    [currencies],
  )

  if (
    currencies === null ||
    categories === null ||
    accounts === null ||
    transactions === null ||
    exchangeRates === null
  ) {
    return <CircularProgress />
  }

  if (default_currency === null) {
    return (
      <ContentWithHeader title="What's your main currency?" button="none">
        <div style={{ padding: '1rem' }}>
          <CurrencyForm onSubmit={onNewCurrency} submitText="Create" scriptRunner={testGetRateScript} />
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
        sorter={(a, b) => b.ordering - a.ordering}
      >
        <BasicCrudServiceWithPersistence
          initialState={accounts}
          longTermStore={accountStore}
          context={AccountServiceContext}
          Augmenter={AccountPersistenceAugmenter}
        >
          <BasicCrudServiceWithPersistence
            initialState={exchangeRates}
            longTermStore={exchangeRateStore}
            context={ExchangeRateServiceContext}
            Augmenter={ExchangeRatePersistenceAugmenter}
          >
            <BasicCrudServiceWithPersistence
              initialState={transactions}
              longTermStore={transactionStore}
              context={TransactionServiceContext}
              Augmenter={NilPersistenceAugmenter}
              sorter={(a, b) => b.date.getTime() - a.date.getTime()}
            >
              <MixedAugmentationProvider>
                <BrowserRouter>
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
                </BrowserRouter>
              </MixedAugmentationProvider>
            </BasicCrudServiceWithPersistence>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  )
}

export default AuthenticatedZone
