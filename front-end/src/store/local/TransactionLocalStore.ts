import { BudgeteerDB } from './IndexedDB'
import Transaction, { TransactionUpdatableFields } from '../../domain/model/transaction'
import { IdIdentifier } from '../../domain/model/Unique'

export default class TransactionLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Transaction[]> {
    const transactions = await this.db.transactions.toCollection().toArray()
    return transactions.map(
      (transaction) =>
        new Transaction(
          transaction.id,
          transaction.amount,
          transaction.currency,
          transaction.category,
          transaction.date,
          transaction.sender,
          transaction.receiver,
          transaction.note,
          transaction.receiverCurrency,
          transaction.receiverAmount,
        ),
    )
  }

  public async create(data: TransactionUpdatableFields): Promise<Transaction> {
    const newID = await this.db.transactions.put({
      receiverCurrency: data.receiverCurrencyId,
      category: data.categoryId,
      amount: data.amount,
      receiverAmount: data.receiverAmount,
      note: data.note,
      sender: data.senderId,
      date: data.date,
      receiver: data.receiverId,
      currency: data.currencyId,
    })

    return new Transaction(
      newID,
      data.amount,
      data.currencyId,
      data.categoryId,
      data.date,
      data.senderId,
      data.receiverId,
      data.note,
      data.receiverCurrencyId,
      data.receiverAmount,
    )
  }

  public async createKnown(data: Transaction): Promise<void> {
    await this.db.transactions.put({
      id: data.id,
      receiverCurrency: data.receiverCurrencyId,
      category: data.categoryId,
      amount: data.amount,
      receiverAmount: data.receiverAmount,
      note: data.note,
      sender: data.senderId,
      date: data.date,
      receiver: data.receiverId,
      currency: data.currencyId,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<TransactionUpdatableFields>): Promise<void> {
    await this.db.transactions.update(identity.id, {
      receiverCurrency: data.receiverCurrencyId,
      category: data.categoryId,
      amount: data.amount,
      receiverAmount: data.receiverAmount,
      note: data.note,
      sender: data.senderId,
      date: data.date,
      receiver: data.receiverId,
      currency: data.currencyId,
    })
  }

  public async sync(transactions: Transaction[]): Promise<void> {
    await this.db.transactions.clear()
    await this.db.transactions.bulkPut(
      transactions.map((transaction) => ({
        id: transaction.id,
        receiverCurrency: transaction.receiverCurrencyId,
        category: transaction.categoryId,
        amount: transaction.amount,
        receiverAmount: transaction.receiverAmount,
        note: transaction.note,
        sender: transaction.senderId,
        date: transaction.date,
        receiver: transaction.receiverId,
        currency: transaction.currencyId,
      })),
    )
  }
}
