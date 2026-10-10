import { createContext } from 'react'

import { AccountPersistenceAugmentation } from './AccountServiceAugmenter'
import { BasicCrudService } from './BasicCrudService'
import { CategoryPersistenceAugmentation } from './CategoryServiceAugmenter'
import { CurrencyPersistenceAugmentation } from './CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmentation, RateOnDate } from './ExcahngeRateServiceAugmenter'
import { SettlementPersistenceAugmentation } from './SettlementServiceAugmenter'
import { TransactionGroupPersistenceAugmentation } from './TransactionGroupServiceAugmenter'
import { TransactionPersistenceAugmentation } from './TransactionServiceAugmenter'
import { UnconfirmedTransactionPersistenceAugmentation } from './UnconfirmedTransactionServiceAugmenter'
import Account, { AccountID, AccountUpdatableFields } from '../domain/model/account'
import Category, { AugmentedCategory, CategoryID, CategoryUpdatableFields } from '../domain/model/category'
import Currency, { CurrencyID, CurrencyUpdatableFields } from '../domain/model/currency'
import ExchangeRate, { ExchangeRateId, ExchangeRateIdentifiableFields } from '../domain/model/exchangeRate'
import Settlement, { SettlementID, SettlementUpdatableFields } from '../domain/model/settlement'
import Transaction, { TransactionID, TransactionUpdatableFields } from '../domain/model/transaction'
import TransactionGroup, {
  Person,
  TransactionGroupID,
  TransactionGroupUpdatableFields,
} from '../domain/model/transactionGroup'
import UnconfirmedTransaction, {
  UnconfirmedTransactionID,
  UnconfirmedTransactionUpdatableFields,
} from '../domain/model/unconfirmedTransaction'
import Unique, { IdIdentifier } from '../domain/model/Unique'
import { UpdateExchangeRateFields } from '../store/remote/dto/exchangeRate'

const nilPersistence = {
  initialized: false,
  state: [],
  version: -1,
  create<IdType, Item extends Unique<IdType, Item>, IdentifiableFields, UpdatableFields>(
    _data: UpdatableFields,
    _identity?: IdentifiableFields,
  ): Promise<Item> {
    return Promise.reject(new Error('nilPersistence'))
  },
  update<IdentifiableFields, UpdatableFields>(_identity: IdentifiableFields, _data: UpdatableFields): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  delete<IdentifiableFields>(_identity: IdentifiableFields): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  refresh(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
}

export const CategoryServiceContext = createContext<
  BasicCrudService<CategoryID, Category, IdIdentifier, CategoryUpdatableFields> & CategoryPersistenceAugmentation
>({
  ...nilPersistence,
  augmentedVersion: -1,
  get tentativeRoot(): Category | null {
    throw new Error('root is not implemented')
  },
  get subCategories(): { [parent: CategoryID]: Category[] } {
    throw new Error('subCategories is not implemented')
  },
  get augmentedCategories(): AugmentedCategory[] {
    throw new Error('augmentedCategories is not implemented')
  },
  deleteCategory: () => Promise.reject(new Error('deleteCategory is not implemented')),
})

export const CurrencyServiceContext = createContext<
  BasicCrudService<CurrencyID, Currency, IdIdentifier, CurrencyUpdatableFields> & CurrencyPersistenceAugmentation
>({
  ...nilPersistence,
  augmentedVersion: -1,
  get tentativeDefaultCurrency(): Currency | null {
    return null
  },
})

export const AccountServiceContext = createContext<
  BasicCrudService<AccountID, Account, IdIdentifier, AccountUpdatableFields> & AccountPersistenceAugmentation
>({
  ...nilPersistence,
  augmentedVersion: -1,
  get myOwnAccounts(): Account[] {
    throw new Error('myOwnAccounts is not implemented')
  },
  get otherAccounts(): Account[] {
    throw new Error('otherAccounts is not implemented')
  },
  deleteAccount: () => Promise.reject(new Error('deleteAccount is not implemented')),
})

export const ExchangeRateServiceContext = createContext<
  BasicCrudService<ExchangeRateId, ExchangeRate, ExchangeRateIdentifiableFields, UpdateExchangeRateFields> &
    ExchangeRatePersistenceAugmentation
>({
  ...nilPersistence,
  augmentedVersion: -1,
  get exchangeRates(): Map<number, Map<number, RateOnDate[]>> {
    throw new Error('myOwnAccounts is not implemented')
  },
})

export const TransactionServiceContext = createContext<
  BasicCrudService<TransactionID, Transaction, IdIdentifier, TransactionUpdatableFields> &
    TransactionPersistenceAugmentation
>({
  ...nilPersistence,
  transactionsFromGroupMembers: [],
})

export const UnconfirmedTransactionServiceContext = createContext<
  BasicCrudService<
    UnconfirmedTransactionID,
    UnconfirmedTransaction,
    IdIdentifier,
    UnconfirmedTransactionUpdatableFields
  > &
    UnconfirmedTransactionPersistenceAugmentation
>({
  ...nilPersistence,
  promote(): Promise<number> {
    return Promise.reject(new Error('nilPersistence'))
  },
})

export const TransactionGroupServiceContext = createContext<
  BasicCrudService<TransactionGroupID, TransactionGroup, IdIdentifier, TransactionGroupUpdatableFields> &
    TransactionGroupPersistenceAugmentation
>({
  ...nilPersistence,
  augmentedVersion: -1,
  get knownPeople(): Person[] {
    throw new Error('knownUsers is not implemented')
  },
  setTransactionSplit(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  changeSplit(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
})

export const SettlementServiceContext = createContext<
  BasicCrudService<SettlementID, Settlement, IdIdentifier, SettlementUpdatableFields> &
    SettlementPersistenceAugmentation
>({
  ...nilPersistence,
  createSettlement(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  updateSettlement(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  confirmSettlement(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  recordSettlementTransaction(): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
})
