import Dexie, { type EntityTable, Table } from 'dexie'

interface Currency {
  id: number
  name: string
  symbol: string
  decimalPoints: number
  rateFetchScript: string
  autoUpdate: boolean
}

type CurrencyDB = {
  currencies: EntityTable<Currency, 'id'>
}

interface Account {
  id: number
  name: string
  initialAmounts: {
    currencyId: number
    value: number
  }[]
  isMine: boolean
  financialInstitution: string
  type: string
}

type AccountDB = {
  accounts: EntityTable<Account, 'id'>
}

interface Category {
  id: number
  name: string
  parentId: number | null
  iconName: string
  iconColor: string
  iconBackground: string
  fixedCosts: boolean
  ordering: number
}

type CategoryDB = {
  categories: EntityTable<Category, 'id'>
}

interface ExchangeRate {
  a: number
  b: number
  date: Date
  rate: number
}

export type ExchangeRateCompositeKey = [number, number, Date]
type ExchangeRateDB = {
  exchangeRates: Table<ExchangeRate, ExchangeRateCompositeKey, ExchangeRate>
}

interface Transaction {
  id: number
  amount: number
  currency: number
  sender: number | null
  receiver: number | null
  category: number | null
  date: Date
  note: string
  receiverCurrency: number
  receiverAmount: number
}

type TransactionDB = {
  transactions: EntityTable<Transaction, 'id'>
}

export type ActionType = 'create' | 'update' | 'delete'

interface Action {
  id: number
  time: number
  itemType: string
  actionType: ActionType
  identity: unknown
  data: unknown
}

type ReplayDB = {
  replay: EntityTable<Action, 'id'>
}

export const BudgeteerDatabaseName = 'BudgeteerLocalDB'
class BudgeteerDB extends Dexie {
  currencies!: CurrencyDB
  accounts!: AccountDB
  categories!: ExchangeRateDB
  exchangeRates!: CategoryDB
  transactions!: TransactionDB
  replay!: ReplayDB

  constructor() {
    super(BudgeteerDatabaseName)
    this.version(1).stores({
      currencies: '++id',
      accounts: '++id',
      categories: '++id',
      exchangeRates: '[a+b+date]',
      transactions: '++id',
      replay: '++id,time',
    })
  }
}

export type { Currency, Account, Category, Action, Transaction, ExchangeRate }

const IndexedDB = new BudgeteerDB()
export default IndexedDB
