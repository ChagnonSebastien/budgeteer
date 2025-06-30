import { BudgeteerDB } from './indexedDb/db'
import Transaction, { TransactionUpdatableFields } from '../../domain/model/transaction'
import { IdIdentifier } from '../../domain/model/Unique'

export default class TransactionLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Transaction[]> {
    const transactions: Transaction[] = []
    await this.db.transactions.each((transaction) => {
      transactions.push(
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
    })
    return transactions
  }

  public async create(data: TransactionUpdatableFields): Promise<Transaction> {
    const newID = await this.db.transactions.add({
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
    await this.db.transactions.add({
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
    await Promise.all(
      transactions.map((transaction) =>
        this.db.transactions.add({
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
        }),
      ),
    )
  }
}
