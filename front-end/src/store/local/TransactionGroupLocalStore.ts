import { BudgeteerDB } from './IndexedDB'
import TransactionGroup, { Person, TransactionGroupUpdatableFields } from '../../domain/model/transactionGroup'
import { IdIdentifier } from '../../domain/model/Unique'

export default class TransactionGroupLocalStore {
  private db: BudgeteerDB

  constructor(
    private userEmail: string,
    private userName: string,
    db: BudgeteerDB,
  ) {
    this.db = db
  }

  public async getAll(): Promise<TransactionGroup[]> {
    const transactionGroups = await this.db.transactionGroups.toCollection().toArray()
    return transactionGroups.map(
      (transactionGroup) =>
        new TransactionGroup(
          transactionGroup.id,
          transactionGroup.name,
          transactionGroup.originalCurrency,
          transactionGroup.splitType,
          transactionGroup.members.map(
            (member) => new Person(member.email, member.name, member.splitValue, member.joined),
          ),
          transactionGroup.currency,
          transactionGroup.category,
          transactionGroup.hidden,
        ),
    )
  }

  public async create(data: Omit<TransactionGroup, 'id' | 'members'>): Promise<TransactionGroup> {
    const newID = await this.db.transactionGroups.put({
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: data.splitType,
      members: [{ email: this.userEmail, name: this.userName, splitValue: null, joined: true }],
      currency: data.currency,
      category: data.category,
      hidden: data.hidden,
    })

    return new TransactionGroup(
      newID,
      data.name,
      data.originalCurrency,
      data.splitType,
      [new Person(this.userEmail, this.userName, null, true)],
      data.currency,
      data.category,
      data.hidden,
    )
  }

  public async createKnown(data: TransactionGroup): Promise<void> {
    await this.db.transactionGroups.put({
      id: data.id,
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: data.splitType,
      members: data.members,
      currency: data.currency,
      category: data.category,
      hidden: data.hidden,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<TransactionGroupUpdatableFields>): Promise<void> {
    let updateQuery = {}
    if (typeof data.name !== 'undefined') {
      updateQuery = { ...updateQuery, name: data.name }
    }
    if (typeof data.splitType !== 'undefined') {
      updateQuery = { ...updateQuery, splitType: data.splitType }
    }
    if (typeof data.category !== 'undefined') {
      updateQuery = { ...updateQuery, category: data.category }
    }
    if (typeof data.currency !== 'undefined') {
      updateQuery = { ...updateQuery, currency: data.currency }
    }
    if (typeof data.members !== 'undefined') {
      updateQuery = { ...updateQuery, members: data.members }
    }
    if (typeof data.hidden !== 'undefined') {
      updateQuery = { ...updateQuery, hidden: data.hidden }
    }

    await this.db.transactionGroups.update(identity.id, updateQuery)
  }

  public async sync(transactionGroups: TransactionGroup[]): Promise<void> {
    await this.db.transactionGroups.clear()
    await this.db.transactionGroups.bulkPut(
      transactionGroups.map((transactionGroup) => ({
        id: transactionGroup.id,
        name: transactionGroup.name,
        originalCurrency: transactionGroup.originalCurrency,
        splitType: transactionGroup.splitType,
        members: transactionGroup.members,
        currency: transactionGroup.currency,
        category: transactionGroup.category,
        hidden: transactionGroup.hidden,
      })),
    )
  }
}
