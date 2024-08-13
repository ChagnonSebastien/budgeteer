import { createContext } from "react"
import Account from "../domain/model/account"
import Category from "../domain/model/category"
import Currency from "../domain/model/currency"
import Transaction from "../domain/model/transaction"
import Unique from "../domain/model/Unique"
import { BasicCrudService } from "./BasicCrudService"
import { CategoryPersistenceAugmentation } from "./CategoryServiceAugmenter"

const nilPersistence = {
  state: [],
  create<T extends Unique>(_data: Omit<T, "id">): Promise<T> {
    return Promise.reject(new Error("nilPersistence"))
  },
  get root(): Category {
    throw new Error("root is not implemented")
  },
}

export const CategoryPersistenceContext = createContext<BasicCrudService<Category> & CategoryPersistenceAugmentation>(nilPersistence)
export const CurrencyServiceContext = createContext<BasicCrudService<Currency>>(nilPersistence)
export const AccountServiceContext = createContext<BasicCrudService<Account>>(nilPersistence)
export const TransactionServiceContext = createContext<BasicCrudService<Transaction>>(nilPersistence)
