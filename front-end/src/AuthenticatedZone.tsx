import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import React, { FC, ReactNode, useContext, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { UpdatePreferencesContext, UserContext } from './App'
import FirstAccountSetup from './components/accounts/FirstAccountSetup'
import CategoryTutorial from './components/categories/CategoryTutorial'
import WelcomeCurrencySetup from './components/currencies/WelcomeCurrencySetup'
import LoadingScreen from './components/LoadingScreen'
import DrawerWrapper from './components/Menu'
import { Centered } from './components/shared/Layout'
import UsageChoice from './components/usage/UsageChoice'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from './domain/model/currency'
import { IdIdentifier } from './domain/model/Unique'
import { needsUsageChoice } from './domain/model/user'
import AccountsPage from './pages/AccountsPage'
import AdministrationPage from './pages/AdministrationPage'
import CategoryPage from './pages/CategoryPage'
import CostsAnalysisPage from './pages/CostsAnalysisPage'
import CreateAccountPage from './pages/CreateAccountPage'
import CreateCategoryPage from './pages/CreateCategoryPage'
import CreateCurrencyPage from './pages/CreateCurrencyPage'
import CreateTransactionGroupPage from './pages/CreateTransactionGroupPage'
import CreateTransactionPage from './pages/CreateTransactionPage'
import CreateUnconfirmedTransactionPage from './pages/CreateUnconfirmedTransactionPage'
import CurrenciesPage from './pages/CurrenciesPage'
import CurrencyRatesPage from './pages/CurrencyRatesPage'
import Dashboard from './pages/Dashboard'
import EditAccountPage from './pages/EditAccountPage'
import EditCategoryPage from './pages/EditCategoryPage'
import EditCurrencyPage from './pages/EditCurrencyPage'
import EditTransactionPage from './pages/EditTransactionPage'
import EditUnconfirmedTransactionPage from './pages/EditUnconfirmedTransactionPage'
import ImportTransactionsPage from './pages/ImportTransactionsPage'
import InvestmentsPerformancePage from './pages/InvestmentsPerformancePage'
import ManageTransactionGroup from './pages/ManageTransactionGroup'
import NetWorthPage from './pages/NetWorthPage'
import PromoteUnconfirmedTransactionPage from './pages/PromoteUnconfirmedTransactionPage'
import SettlementPage from './pages/SettlementPage'
import TransactionGroups from './pages/TransactionGroups'
import TransactionPage from './pages/TransactionPage'
import TrendsPage from './pages/TrendsPage'
import { makeAccountPersistenceAugmenter } from './service/AccountServiceAugmenter'
import { BasicCrudServiceWithPersistence } from './service/BasicCrudServiceWithPersistence'
import { makeCategoryPersistenceAugmenter } from './service/CategoryServiceAugmenter'
import { makeCurrencyPersistenceAugmenter } from './service/CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmenter } from './service/ExcahngeRateServiceAugmenter'
import { MixedAugmentationProvider } from './service/MixedAugmentation'
import { OnlineContext } from './service/OnlineContext'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  ImportStoreContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  SettlementServiceContext,
  UnconfirmedTransactionServiceContext,
  UserStoreContext,
} from './service/ServiceContext'
import { makeSettlementPersistenceAugmenter } from './service/SettlementServiceAugmenter'
import { makeTransactionGroupPersistenceAugmenter } from './service/TransactionGroupServiceAugmenter'
import { TransactionPersistenceAugmenter } from './service/TransactionServiceAugmenter'
import { makeUnconfirmedTransactionPersistenceAugmenter } from './service/UnconfirmedTransactionServiceAugmenter'
import AccountLocalStore from './store/local/AccountLocalStore'
import CategoryLocalStore from './store/local/CategoryLocalStore'
import CurrencyLocalStore from './store/local/CurrencyLocalStore'
import ExchangeRateLocalStore from './store/local/ExchangeRateLocalStore'
import IndexedDB from './store/local/IndexedDB'
import ReplayStore from './store/local/ReplayStore'
import SettlementLocalStore from './store/local/SettlementLocalStore'
import TransactionGroupLocalStore from './store/local/TransactionGroupLocalStore'
import TransactionLocalStore from './store/local/TransactionLocalStore'
import UnconfirmedTransactionLocalStore from './store/local/UnconfirmedTransactionLocalStore'
import AccountRemoteStore from './store/remote/AccountRemoteStore'
import CategoryRemoteStore from './store/remote/CategoryRemoteStore'
import CurrencyRemoteStore from './store/remote/CurrencyRemoteStore'
import ExchangeRateRemoteStore from './store/remote/ExchangeRateRemoteStore'
import ImportRemoteStore from './store/remote/ImportRemoteStore'
import SettlementRemoteStore from './store/remote/SettlementRemoteStore'
import TransactionGroupRemoteStore from './store/remote/TransactionGroupRemoteStore'
import TransactionRemoteStore from './store/remote/TransactionRemoteStore'
import UnconfirmedTransactionRemoteStore from './store/remote/UnconfirmedTransactionRemoteStore'
import UserRemoteStore from './store/remote/UserRemoteStore'

const transport = new GrpcWebFetchTransport({
  baseUrl: import.meta.env.VITE_BACKEND_URL || '/',
  fetchInit: { credentials: 'include' },
})

const currencyRemoteStore = new CurrencyRemoteStore(transport)
const categoryRemoteStore = new CategoryRemoteStore(transport)
const accountRemoteStore = new AccountRemoteStore(transport)
const transactionRemoteStore = new TransactionRemoteStore(transport)
const exchangeRateRemoteStore = new ExchangeRateRemoteStore(transport)
const unconfirmedTransactionRemoteStore = new UnconfirmedTransactionRemoteStore(transport)
const importRemoteStore = new ImportRemoteStore(transport)
const userRemoteStore = new UserRemoteStore(transport)

const currencyLocalStore = new CurrencyLocalStore(IndexedDB)
const categoryLocalStore = new CategoryLocalStore(IndexedDB)
const accountLocalStore = new AccountLocalStore(IndexedDB)
const transactionLocalStore = new TransactionLocalStore(IndexedDB)
const exchangeRateLocalStore = new ExchangeRateLocalStore(IndexedDB)
const unconfirmedTransactionLocalStore = new UnconfirmedTransactionLocalStore(IndexedDB)
const settlementRemoteStore = new SettlementRemoteStore(transport)
const settlementLocalStore = new SettlementLocalStore(IndexedDB)
const SettlementPersistenceAugmenter = makeSettlementPersistenceAugmenter(settlementRemoteStore)
const replayStore = new ReplayStore(IndexedDB)
const AccountPersistenceAugmenterWithRemote = makeAccountPersistenceAugmenter(accountRemoteStore)
const CategoryPersistenceAugmenterWithRemote = makeCategoryPersistenceAugmenter(categoryRemoteStore)
const CurrencyPersistenceAugmenterWithRemote = makeCurrencyPersistenceAugmenter(currencyRemoteStore)

const UnconfirmedTransactionPersistenceAugmenter = makeUnconfirmedTransactionPersistenceAugmenter(
  unconfirmedTransactionRemoteStore,
)

const CategoryTutorialGate: FC<{ children: ReactNode }> = ({ children }) => {
  const { preferences } = useContext(UserContext)
  const updatePreferences = useContext(UpdatePreferencesContext)
  const { augmentedCategories } = useContext(CategoryServiceContext)
  const [showTutorial, setShowTutorial] = useState(
    () => !preferences?.categoryTutorialDone && augmentedCategories.length <= 1,
  )

  if (!showTutorial) return children

  return (
    <CategoryTutorial
      onDone={() => {
        setShowTutorial(false)
        updatePreferences({ categoryTutorialDone: true }).catch(console.error)
      }}
    />
  )
}

const MustBeConnectedToInternetOnFirstSetup: FC<{ children: ReactNode }> = ({ children }) => {
  const online = useContext(OnlineContext)
  return online ? children : <Centered>Internet connection required on first use</Centered>
}

const CreateDefaultCurrency: FC<{
  create: (data: CurrencyUpdatableFields, identity?: IdIdentifier) => Promise<Currency>
  setDefaultCurrency(id: number): void
}> = ({ create, setDefaultCurrency }) => {
  return (
    <UserContext.Consumer>
      {(user) =>
        user.default_currency === null ? (
          <MustBeConnectedToInternetOnFirstSetup>
            <WelcomeCurrencySetup
              onSubmit={async (choice) => {
                const newCurrency = await create({
                  name: choice.name,
                  symbol: choice.code,
                  type: '',
                  risk: '',
                  decimalPoints: choice.decimalPoints,
                  rateAutoupdateSettings: new RateAutoupdateSettings('', false),
                })
                await currencyRemoteStore.setDefault(newCurrency.id)
                setDefaultCurrency(newCurrency.id)
              }}
            />
          </MustBeConnectedToInternetOnFirstSetup>
        ) : (
          <LoadingScreen />
        )
      }
    </UserContext.Consumer>
  )
}

const AssurePersonalAccount: FC<{ NextComponent: FC }> = ({ NextComponent }) => {
  const { hidden_default_account } = useContext(UserContext)
  const { myOwnAccounts } = useContext(AccountServiceContext)
  return myOwnAccounts.some((a) => a.id !== hidden_default_account) ? <NextComponent /> : <FirstAccountSetup />
}

const WaitOnAtLeastOneCategory: FC<{ NextComponent: FC }> = ({ NextComponent }) => (
  <CategoryServiceContext.Consumer>
    {(value) =>
      value.augmentedCategories.length === 0 ? (
        <MustBeConnectedToInternetOnFirstSetup>
          <LoadingScreen />
        </MustBeConnectedToInternetOnFirstSetup>
      ) : (
        <AssurePersonalAccount NextComponent={NextComponent} />
      )
    }
  </CategoryServiceContext.Consumer>
)

const AssureMinimumConfig: FC<{
  NextComponent: FC
  setDefaultCurrency(id: number): void
}> = ({ NextComponent, setDefaultCurrency }) => {
  const user = useContext(UserContext)
  return (
    <BrowserRouter>
      <CurrencyServiceContext.Consumer>
        {(currencyContext) =>
          needsUsageChoice(user) ? (
            <MustBeConnectedToInternetOnFirstSetup>
              <UsageChoice />
            </MustBeConnectedToInternetOnFirstSetup>
          ) : !currencyContext.tentativeDefaultCurrency ? (
            <CreateDefaultCurrency create={currencyContext.create} setDefaultCurrency={setDefaultCurrency} />
          ) : (
            <WaitOnAtLeastOneCategory NextComponent={NextComponent} />
          )
        }
      </CurrencyServiceContext.Consumer>
    </BrowserRouter>
  )
}

const WaitOnInitializedData: FC<{
  NextComponent: FC
  setDefaultCurrency(id: number): void
}> = ({ NextComponent, setDefaultCurrency }) => (
  <TransactionGroupServiceContext.Consumer>
    {(transactionGroupCtx) => (
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
                          !transactionGroupCtx.initialized ||
                          !transactionGroupCtx.version != !transactionGroupCtx.augmentedVersion ||
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
    )}
  </TransactionGroupServiceContext.Consumer>
)

const PersistenceSetup: FC<{ children: ReactNode }> = ({ children }) => {
  const { email, name: username } = useContext(UserContext)
  const [transactionGroupLocalStore] = useState(new TransactionGroupLocalStore(email, username, IndexedDB))
  const [transactionGroupRemoteStore] = useState(new TransactionGroupRemoteStore(email, username, transport))
  const [TransactionGroupPersistenceAugmenter] = useState(() =>
    makeTransactionGroupPersistenceAugmenter(transactionGroupRemoteStore),
  )

  return (
    <BasicCrudServiceWithPersistence
      itemName="currency"
      synced={true}
      longTermStore={currencyRemoteStore}
      localStore={currencyLocalStore}
      actionStore={replayStore}
      context={CurrencyServiceContext}
      Augmenter={CurrencyPersistenceAugmenterWithRemote}
      sorter={(a, b) => b.id - a.id}
    >
      <BasicCrudServiceWithPersistence
        itemName="category"
        synced={true}
        longTermStore={categoryRemoteStore}
        localStore={categoryLocalStore}
        actionStore={replayStore}
        context={CategoryServiceContext}
        Augmenter={CategoryPersistenceAugmenterWithRemote}
        sorter={(a, b) => {
          if (b.ordering !== a.ordering) return b.ordering - a.ordering
          return b.id - a.id
        }}
      >
        <BasicCrudServiceWithPersistence
          itemName="account"
          synced={true}
          longTermStore={accountRemoteStore}
          localStore={accountLocalStore}
          actionStore={replayStore}
          context={AccountServiceContext}
          Augmenter={AccountPersistenceAugmenterWithRemote}
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
              Augmenter={TransactionPersistenceAugmenter}
              sorter={(a, b) => {
                if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
                return b.id - a.id
              }}
            >
              <BasicCrudServiceWithPersistence
                itemName="transactionGroup"
                synced={true}
                longTermStore={transactionGroupRemoteStore}
                localStore={transactionGroupLocalStore}
                actionStore={replayStore}
                context={TransactionGroupServiceContext}
                Augmenter={TransactionGroupPersistenceAugmenter}
                sorter={(a, b) => b.id - a.id}
              >
                <BasicCrudServiceWithPersistence
                  itemName="unconfirmedTransaction"
                  synced={true}
                  longTermStore={unconfirmedTransactionRemoteStore}
                  localStore={unconfirmedTransactionLocalStore}
                  actionStore={replayStore}
                  context={UnconfirmedTransactionServiceContext}
                  Augmenter={UnconfirmedTransactionPersistenceAugmenter}
                  sorter={(a, b) => {
                    if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
                    return b.id - a.id
                  }}
                >
                  <BasicCrudServiceWithPersistence
                    itemName="settlement"
                    synced={true}
                    longTermStore={settlementRemoteStore}
                    localStore={settlementLocalStore}
                    actionStore={replayStore}
                    context={SettlementServiceContext}
                    Augmenter={SettlementPersistenceAugmenter}
                    sorter={(a, b) => {
                      if (b.date.getTime() !== a.date.getTime()) return b.date.getTime() - a.date.getTime()
                      return b.id - a.id
                    }}
                  >
                    {children}
                  </BasicCrudServiceWithPersistence>
                </BasicCrudServiceWithPersistence>
              </BasicCrudServiceWithPersistence>
            </BasicCrudServiceWithPersistence>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  )
}

interface Props {
  logout(): void
  setDefaultCurrency(id: number): void
}

const AuthenticatedZone: FC<Props> = (props) => {
  const { logout, setDefaultCurrency } = props
  const { is_admin: isAdmin } = useContext(UserContext)

  const testGetRateScript = useMemo(() => exchangeRateRemoteStore.testGetRateScript(), [])

  const FullyAugmentedView = useMemo<FC>(
    () => () => (
      <CategoryTutorialGate>
        <DrawerWrapper logout={logout}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<CurrenciesPage />} />
            <Route path="/assets/new" element={<CreateCurrencyPage />} />
            <Route path="/assets/edit/:currencyId" element={<EditCurrencyPage />} />
            <Route path="/assets/rates/:currencyId" element={<CurrencyRatesPage scriptRunner={testGetRateScript} />} />
            <Route path="/categories" element={<CategoryPage />} />
            <Route path="/categories/new" element={<CreateCategoryPage />} />
            <Route path="/categories/edit/:categoryId" element={<EditCategoryPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/new" element={<CreateAccountPage />} />
            <Route path="/accounts/edit/:accountId" element={<EditAccountPage />} />
            <Route path="/transactions" element={<TransactionPage />} />
            <Route path="/transactions/new" element={<CreateTransactionPage />} />
            <Route path="/transactions/import" element={<ImportTransactionsPage />} />
            <Route path="/transactions/edit/:transactionId" element={<EditTransactionPage />} />
            <Route path="/net-worth" element={<NetWorthPage />} />
            <Route path="/costs" element={<CostsAnalysisPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/investments" element={<InvestmentsPerformancePage />} />
            <Route path="/transaction-groups" element={<TransactionGroups />} />
            <Route path="/transaction-groups/new" element={<CreateTransactionGroupPage />} />
            <Route path="/transaction-groups/manage/:transactionGroupId" element={<ManageTransactionGroup />} />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/unconfirmed/new"
              element={<CreateUnconfirmedTransactionPage />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/unconfirmed/:unconfirmedTransactionId"
              element={<EditUnconfirmedTransactionPage />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/settle"
              element={<SettlementPage mode="new" />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/settle/:settlementId/edit"
              element={<SettlementPage mode="edit" />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/settle/:settlementId/confirm"
              element={<SettlementPage mode="confirm" />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/settle/:settlementId/record"
              element={<SettlementPage mode="record" />}
            />
            <Route
              path="/transaction-groups/manage/:transactionGroupId/unconfirmed/:unconfirmedTransactionId/promote"
              element={<PromoteUnconfirmedTransactionPage />}
            />
            {isAdmin && <Route path="/administration" element={<AdministrationPage />} />}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </DrawerWrapper>
      </CategoryTutorialGate>
    ),
    [logout, testGetRateScript, isAdmin],
  )

  const CompleteView = useMemo<FC>(
    () => () => <MixedAugmentationProvider NextComponent={FullyAugmentedView} />,
    [FullyAugmentedView],
  )

  return (
    <ImportStoreContext.Provider value={importRemoteStore}>
      <UserStoreContext.Provider value={userRemoteStore}>
        <PersistenceSetup>
          <WaitOnInitializedData NextComponent={CompleteView} setDefaultCurrency={setDefaultCurrency} />
        </PersistenceSetup>
      </UserStoreContext.Provider>
    </ImportStoreContext.Provider>
  )
}

export default AuthenticatedZone
