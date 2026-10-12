import type { Account, Settlement, Transaction } from '../store/local/IndexedDB'

export interface Entry {
  date: Date
  amount: number
  currency: number
  sender: number | null
  receiver: number | null
  category: number | null
  note?: string
  receiverCurrency?: number
  receiverAmount?: number
  investment?: number
  group?: number
  owner?: string
}

export default class Ledger {
  readonly accounts: Account[] = []
  readonly transactions: Transaction[] = []
  readonly settlements: Settlement[] = []
  private readonly payees = new Map<string, number>()
  private readonly balances = new Map<number, Map<number, number>>()

  constructor(
    private readonly owner: string,
    private readonly now: Date,
  ) {}

  open(name: string, type: string, institution: string, createdAt: Date, initial: [number, number][] = []): number {
    const id = this.accounts.length + 1
    this.accounts.push({
      id,
      name,
      type,
      financialInstitution: institution,
      isMine: true,
      isDebt: type === 'Credit card' || type === 'Loan',
      createdAt,
      initialAmounts: initial.map(([currencyId, value]) => ({ currencyId, value })),
    })
    this.balances.set(id, new Map(initial))
    return id
  }

  payee(name: string, date: Date): number {
    const known = this.payees.get(name)
    if (known !== undefined) return known

    const id = this.accounts.length + 1
    this.accounts.push({
      id,
      name,
      type: '',
      financialInstitution: '',
      isMine: false,
      isDebt: false,
      createdAt: date,
      initialAmounts: [],
    })
    this.payees.set(name, id)
    return id
  }

  balance(account: number, currency: number): number {
    return this.balances.get(account)?.get(currency) ?? 0
  }

  record(entry: Entry): number {
    const id = this.transactions.length + 1
    const owner = entry.owner ?? this.owner
    // Events planned later today would otherwise land in the future.
    const date = entry.date > this.now ? new Date(this.now.getTime() - 60_000) : entry.date
    const receiverCurrency = entry.receiverCurrency ?? entry.currency
    const receiverAmount = entry.receiverAmount ?? entry.amount

    this.transactions.push({
      id,
      owner,
      amount: entry.amount,
      currency: entry.currency,
      sender: entry.sender,
      receiver: entry.receiver,
      category: entry.category,
      date,
      note: entry.note ?? '',
      receiverCurrency,
      receiverAmount,
      financialIncomeData: entry.investment === undefined ? null : { relatedCurrencyId: entry.investment },
      transactionGroupData: entry.group === undefined ? null : { transactionGroupId: entry.group, splitOverride: null },
    })

    if (owner === this.owner) {
      if (entry.sender !== null) this.adjust(entry.sender, entry.currency, -entry.amount)
      if (entry.receiver !== null) this.adjust(entry.receiver, receiverCurrency, receiverAmount)
    }
    return id
  }

  settle(settlement: Omit<Settlement, 'id'>) {
    this.settlements.push({ id: this.settlements.length + 1, ...settlement })
  }

  private adjust(account: number, currency: number, delta: number) {
    const byCurrency = this.balances.get(account)
    if (byCurrency) byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + delta)
  }
}
