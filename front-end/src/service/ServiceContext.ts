import { createContext } from 'react'

import { AccountPersistenceAugmentation } from './AccountServiceAugmenter'
import { BasicCrudService } from './BasicCrudService'
import { CategoryPersistenceAugmentation } from './CategoryServiceAugmenter'
import { CurrencyPersistenceAugmentation } from './CurrencyServiceAugmenter'
import Account from '../domain/model/account'
import Category, { AugmentedCategory } from '../domain/model/category'
import Currency from '../domain/model/currency'
import Transaction from '../domain/model/transaction'
import Unique from '../domain/model/Unique'

const nilPersistence = {
  state: [],
  create<T extends Unique>(_data: Omit<T, 'id' | 'hasName'>): Promise<T> {
    return Promise.reject(new Error('nilPersistence'))
  },
  update<T extends Unique>(_id: number, _data: Omit<T, 'id' | 'hasName'>): Promise<void> {
    return Promise.reject(new Error('nilPersistence'))
  },
  get root(): Category {
    throw new Error('root is not implemented')
  },
  get subCategories(): { [parent: number]: Category[] } {
    throw new Error('subCategories is not implemented')
  },
  get myOwnAccounts(): Account[] {
    throw new Error('myOwnAccounts is not implemented')
  },
  get otherAccounts(): Account[] {
    throw new Error('otherAccounts is not implemented')
  },
  get defaultCurrency(): Currency | null {
    return null
  },
  get augmentedCategories(): AugmentedCategory[] {
    throw new Error('augmentedCategories is not implemented')
  },
}

export const CategoryServiceContext = createContext<BasicCrudService<Category> & CategoryPersistenceAugmentation>(
  nilPersistence,
)
export const CurrencyServiceContext = createContext<BasicCrudService<Currency> & CurrencyPersistenceAugmentation>(
  nilPersistence,
)
export const AccountServiceContext = createContext<BasicCrudService<Account> & AccountPersistenceAugmentation>(
  nilPersistence,
)
export const TransactionServiceContext = createContext<BasicCrudService<Transaction>>(nilPersistence)
