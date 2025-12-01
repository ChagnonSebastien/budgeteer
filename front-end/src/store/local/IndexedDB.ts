import Dexie, { type EntityTable, Table } from 'dexie'

import { SplitTypeOverride } from '../../domain/model/transaction'
import { SplitType } from '../../domain/model/transactionGroup'

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

interface FinancialIncomeData {
  relatedCurrencyId: number
}

interface MemberValue {
  email: string
  value: number | null
}

interface SplitOverride {
  splitTypeOverride: SplitTypeOverride
  memberValues: MemberValue[]
}

interface TransactionGroupData {
  transactionGroupId: number
  splitOverride: SplitOverride | null
}

interface Transaction {
  id: number
  owner: string
  amount: number
  currency: number
  sender: number | null
  receiver: number | null
  category: number | null
  date: Date
  note: string
  receiverCurrency: number
  receiverAmount: number
  financialIncomeData: FinancialIncomeData | null
  transactionGroupData: TransactionGroupData | null
}

interface TransactionGroupMember {
  email: string
  name: string
  splitValue: number | null
  joined: boolean
}

interface TransactionGroup {
  id: number
  name: string
  originalCurrency: string
  splitType: SplitType
  members: TransactionGroupMember[]
  currency: number | null
  category: number | null
  hidden: boolean
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
  transactionGroups!: EntityTable<TransactionGroup, 'id'>
  replay!: EntityTable<Action, 'id'>

  constructor() {
    super(BudgeteerDatabaseName)
    this.version(1).stores({
      currencies: '++id',
      accounts: '++id',
      categories: '++id',
      exchangeRates: '[a+b+date]',
      transactions: '++id',
      transactionGroups: '++id',
      replay: '++id,time',
    })
  }
}

export type { Currency, Account, Category, Action, Transaction, TransactionGroup, ExchangeRate }

const IndexedDB = new BudgeteerDB()
export default IndexedDB
