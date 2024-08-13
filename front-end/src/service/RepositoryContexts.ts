import { GrpcWebFetchTransport } from "@protobuf-ts/grpcweb-transport"
import { createContext } from "react"
import Account from "../domain/model/account"
import Category from "../domain/model/category"
import Currency from "../domain/model/currency"
import Transaction from "../domain/model/transaction"
import AccountRepository from "./AccountRepository"
import CategoryRepository from "./CategoryRepository"
import CurrencyRepository from "./CurrencyRepository"
import TransactionRepository from "./TransactionRepository"

const transport = new GrpcWebFetchTransport({
  baseUrl: "http://localhost:8080",
})

export const CategoryRepositoryContext = createContext<CategoryRepository>(new CategoryRepository(transport))
export const CurrencyRepositoryContext = createContext<CurrencyRepository>(new CurrencyRepository(transport))
export const AccountRepositoryContext = createContext<AccountRepository>(new AccountRepository(transport))
export const TransactionRepositoryContext = createContext<TransactionRepository>(new TransactionRepository(transport))

interface IPersistence<T> {
  state: T[] | null

  getAll(): Promise<T[]>
}

const nilPersistence = {
  state: null,
  getAll() {
    return Promise.reject("Nil persistence")
  },
}

export const CategoryPersistenceContext = createContext<IPersistence<Category>>(nilPersistence)
export const CurrencyPersistenceContext = createContext<IPersistence<Currency>>(nilPersistence)
export const AccountPersistenceContext = createContext<IPersistence<Account>>(nilPersistence)
export const TransactionPersistenceContext = createContext<IPersistence<Transaction>>(nilPersistence)
