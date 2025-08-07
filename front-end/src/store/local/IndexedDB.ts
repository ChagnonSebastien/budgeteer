import Dexie, { type EntityTable, Table } from 'dexie'

interface Currency {
  id: number
  name: string
  symbol: string
  risk: string
  type: string
  decimalPoints: number
  rateFetchScript: string
  autoUpdate: boolean
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

interface ExchangeRate {
  a: number
  b: number
  date: Date
  rate: number
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
  relatedCurrency: number | null
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

export const BudgeteerDatabaseName = 'BudgeteerLocalDB'
export type ExchangeRateCompositeKey = [number, number, Date]

export class BudgeteerDB extends Dexie {
  currencies!: EntityTable<Currency, 'id'>
  accounts!: EntityTable<Account, 'id'>
  exchangeRates!: Table<ExchangeRate, ExchangeRateCompositeKey, ExchangeRate>
  categories!: EntityTable<Category, 'id'>
  transactions!: EntityTable<Transaction, 'id'>
  replay!: EntityTable<Action, 'id'>

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
