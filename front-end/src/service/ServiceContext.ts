import { createContext } from 'react'

import { AccountPersistenceAugmentation } from './AccountServiceAugmenter'
import { BasicCrudService } from './BasicCrudService'
import { CategoryPersistenceAugmentation } from './CategoryServiceAugmenter'
import { CurrencyPersistenceAugmentation } from './CurrencyServiceAugmenter'
import { ExchangeRatePersistenceAugmentation, RateOnDate } from './ExcahngeRateServiceAugmenter'
import Account, { AccountID, AccountUpdatableFields } from '../domain/model/account'
import Category, { AugmentedCategory, CategoryID, CategoryUpdatableFields } from '../domain/model/category'
import Currency, { CurrencyID, CurrencyUpdatableFields } from '../domain/model/currency'
import ExchangeRate, { ExchangeRateId, ExchangeRateIdentifiableFields } from '../domain/model/exchangeRate'
import Transaction, { TransactionID, TransactionUpdatableFields } from '../domain/model/transaction'
import Unique, { IdIdentifier } from '../domain/model/Unique'
import { UpdateExchangeRateFields } from '../store/remote/dto/exchangeRate'

const nilPersistence = {
  state: [],
  create<Item extends Unique<unknown>, IdentifiableFields, UpdatableFields>(
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
}

export const CategoryServiceContext = createContext<
  BasicCrudService<CategoryID, Category, IdIdentifier, CategoryUpdatableFields> & CategoryPersistenceAugmentation
>({
  ...nilPersistence,
  get root(): Category {
    throw new Error('root is not implemented')
  },
  get subCategories(): { [parent: CategoryID]: Category[] } {
    throw new Error('subCategories is not implemented')
  },
  get augmentedCategories(): AugmentedCategory[] {
    throw new Error('augmentedCategories is not implemented')
  },
})

export const CurrencyServiceContext = createContext<
  BasicCrudService<CurrencyID, Currency, IdIdentifier, CurrencyUpdatableFields> & CurrencyPersistenceAugmentation
>({
  ...nilPersistence,
  get defaultCurrency(): Currency | null {
    return null
  },
})

export const AccountServiceContext = createContext<
  BasicCrudService<AccountID, Account, IdIdentifier, AccountUpdatableFields> & AccountPersistenceAugmentation
>({
  ...nilPersistence,
  get myOwnAccounts(): Account[] {
    throw new Error('myOwnAccounts is not implemented')
  },
  get otherAccounts(): Account[] {
    throw new Error('otherAccounts is not implemented')
  },
})

export const ExchangeRateServiceContext = createContext<
  BasicCrudService<ExchangeRateId, ExchangeRate, ExchangeRateIdentifiableFields, UpdateExchangeRateFields> &
    ExchangeRatePersistenceAugmentation
>({
  ...nilPersistence,
  get exchangeRates(): Map<number, Map<number, RateOnDate[]>> {
    throw new Error('myOwnAccounts is not implemented')
  },
})

export const TransactionServiceContext =
  createContext<BasicCrudService<TransactionID, Transaction, IdIdentifier, TransactionUpdatableFields>>(nilPersistence)
