import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import React, { FC, ReactNode, useMemo } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import LoadingScreen from './components/LoadingScreen'
import DrawerWrapper from './components/Menu'
import { Centered } from './components/shared/Layout'
import TransactionGroups from './pages/TransactionGroups'
import { AccountPersistenceAugmenter } from './service/AccountServiceAugmenter'
import { BasicCrudServiceWithPersistence } from './service/BasicCrudServiceWithPersistence'
import { CategoryPersistenceAugmenter } from './service/CategoryServiceAugmenter'
import { CurrencyPersistenceAugmenter } from './service/CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmenter } from './service/ExcahngeRateServiceAugmenter'
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

const MustBeConnectedToInternetOnFirstSetup: FC<{ children: ReactNode; hasInternet: boolean }> = ({
  children,
  hasInternet,
}) => (hasInternet ? children : <Centered>Internet connection required on first use</Centered>)

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

const WaitOnInitializedData: FC<{
  NextComponent: FC
  hasInternet: boolean
}> = ({ NextComponent, hasInternet }) => (
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
                        <WaitOnAtLeastOneCategory NextComponent={NextComponent} hasInternet={hasInternet} />
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

const PersistenceSetup: FC<{ children: ReactNode; hasInternet: boolean }> = ({ children, hasInternet }) => (
  <BasicCrudServiceWithPersistence
    itemName="currency"
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
}

const SplitWiseZone: FC<Props> = (props) => {
  const { logout, hasInternet } = props

  const testGetRateScript = useMemo(() => exchangeRateRemoteStore.testGetRateScript(), [])

  const FullyAugmentedView = useMemo<FC>(
    () => () => (
      <BrowserRouter>
        <DrawerWrapper logout={logout} userIsGuest>
          <Routes>
            <Route path="/transaction-groups" element={<TransactionGroups />} />
            <Route path="*" element={<Navigate to="/transaction-groups" />} />
          </Routes>
        </DrawerWrapper>
      </BrowserRouter>
    ),
    [logout, testGetRateScript],
  )

  return (
    <PersistenceSetup hasInternet={hasInternet}>
      <WaitOnInitializedData NextComponent={FullyAugmentedView} hasInternet={hasInternet} />
    </PersistenceSetup>
  )
}

export default SplitWiseZone
