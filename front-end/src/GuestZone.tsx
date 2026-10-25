import { Alert, Stack, TextField, Typography } from '@mui/material'
import { GrpcWebFetchTransport } from '@protobuf-ts/grpcweb-transport'
import React, { FC, ReactNode, useContext, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { UserContext } from './App'
import LoadingScreen from './components/LoadingScreen'
import DrawerWrapper from './components/Menu'
import FormWrapper from './components/shared/FormWrapper'
import { Centered } from './components/shared/Layout'
import CreateTransactionGroupPage from './pages/CreateTransactionGroupPage'
import CreateUnconfirmedTransactionPage from './pages/CreateUnconfirmedTransactionPage'
import EditUnconfirmedTransactionPage from './pages/EditUnconfirmedTransactionPage'
import GuestTransactionGroupPage from './pages/GuestTransactionGroupPage'
import SettlementPage from './pages/SettlementPage'
import TransactionGroups from './pages/TransactionGroups'
import { AccountPersistenceAugmenter } from './service/AccountServiceAugmenter'
import { BasicCrudServiceWithPersistence } from './service/BasicCrudServiceWithPersistence'
import { CategoryPersistenceAugmenter } from './service/CategoryServiceAugmenter'
import { CurrencyPersistenceAugmenter } from './service/CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmenter } from './service/ExcahngeRateServiceAugmenter'
import { OnlineContext } from './service/OnlineContext'
import {
  AccountServiceContext,
  CategoryServiceContext,
  CurrencyServiceContext,
  ExchangeRateServiceContext,
  TransactionGroupServiceContext,
  TransactionServiceContext,
  SettlementServiceContext,
  UnconfirmedTransactionServiceContext,
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
import SettlementRemoteStore from './store/remote/SettlementRemoteStore'
import TransactionGroupRemoteStore from './store/remote/TransactionGroupRemoteStore'
import TransactionRemoteStore from './store/remote/TransactionRemoteStore'
import UnconfirmedTransactionRemoteStore from './store/remote/UnconfirmedTransactionRemoteStore'

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

const UnconfirmedTransactionPersistenceAugmenter = makeUnconfirmedTransactionPersistenceAugmenter(
  unconfirmedTransactionRemoteStore,
)

const MustBeConnectedToInternetOnFirstSetup: FC<{ children: ReactNode }> = ({ children }) => {
  const online = useContext(OnlineContext)
  return online ? children : <Centered>Internet connection required on first use</Centered>
}

const WaitOnAtLeastOneCategory: FC<{ NextComponent: FC }> = ({ NextComponent }) => (
  <CategoryServiceContext.Consumer>
    {(value) =>
      value.augmentedCategories.length === 0 ? (
        <MustBeConnectedToInternetOnFirstSetup>
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
}> = ({ NextComponent }) => (
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
                        <WaitOnAtLeastOneCategory NextComponent={NextComponent} />
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

const GroupPersistenceSetup: FC<{ children: ReactNode }> = ({ children }) => {
  const { email, name: username } = useContext(UserContext)
  const [transactionGroupLocalStore] = useState(new TransactionGroupLocalStore(email, username, IndexedDB))
  const [transactionGroupRemoteStore] = useState(new TransactionGroupRemoteStore(email, username, transport))
  const [TransactionGroupPersistenceAugmenter] = useState(() =>
    makeTransactionGroupPersistenceAugmenter(transactionGroupRemoteStore),
  )

  return (
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
  )
}

const PersistenceSetup: FC<{ children: ReactNode }> = ({ children }) => (
  <BasicCrudServiceWithPersistence
    itemName="currency"
    synced={true}
    longTermStore={currencyRemoteStore}
    localStore={currencyLocalStore}
    actionStore={replayStore}
    context={CurrencyServiceContext}
    Augmenter={CurrencyPersistenceAugmenter}
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
    >
      <BasicCrudServiceWithPersistence
        itemName="account"
        synced={true}
        longTermStore={accountRemoteStore}
        localStore={accountLocalStore}
        actionStore={replayStore}
        context={AccountServiceContext}
        Augmenter={AccountPersistenceAugmenter}
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
            <GroupPersistenceSetup>{children}</GroupPersistenceSetup>
          </BasicCrudServiceWithPersistence>
        </BasicCrudServiceWithPersistence>
      </BasicCrudServiceWithPersistence>
    </BasicCrudServiceWithPersistence>
  </BasicCrudServiceWithPersistence>
)

const AskDisplayName: FC<{ setDisplayName(name: string): Promise<void> }> = ({ setDisplayName }) => {
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const submit = async () => {
    if (name.trim() === '') {
      setError('Enter the name the group should see.')
      return
    }
    setError('')
    try {
      await setDisplayName(name.trim())
    } catch {
      setError('Could not save your name. Please try again.')
    }
  }

  return (
    <Centered>
      <Stack spacing={2} sx={{ p: 2, maxWidth: (t) => t.contentWidth.compact, width: '100%' }}>
        <Typography variant="h5">What should the group call you?</Typography>
        <FormWrapper onSubmit={submit} submitText="Continue">
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 64 } }}
            autoFocus
            fullWidth
          />
        </FormWrapper>
      </Stack>
    </Centered>
  )
}

interface Props {
  logout(): void
  setDisplayName(name: string): Promise<void>
}

const GuestZone: FC<Props> = (props) => {
  const { logout, setDisplayName } = props
  const { display_name, authentification_method } = useContext(UserContext)

  const testGetRateScript = useMemo(() => exchangeRateRemoteStore.testGetRateScript(), [])

  const FullyAugmentedView = useMemo<FC>(
    () => () => (
      <BrowserRouter>
        <DrawerWrapper logout={logout} userIsGuest>
          <Routes>
            <Route path="/transaction-groups" element={<TransactionGroups />} />
            <Route path="/transaction-groups/new" element={<CreateTransactionGroupPage />} />
            <Route path="/transaction-groups/manage/:transactionGroupId" element={<GuestTransactionGroupPage />} />
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
            <Route path="*" element={<Navigate to="/transaction-groups" />} />
          </Routes>
        </DrawerWrapper>
      </BrowserRouter>
    ),
    [logout, testGetRateScript],
  )

  // Only a server-confirmed null prompts: a user cached before display names existed has none.
  if (display_name === null && authentification_method === 'guest') {
    return <AskDisplayName setDisplayName={setDisplayName} />
  }

  return (
    <PersistenceSetup>
      <WaitOnInitializedData NextComponent={FullyAugmentedView} />
    </PersistenceSetup>
  )
}

export default GuestZone
