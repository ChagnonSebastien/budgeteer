import { BudgeteerDB } from './IndexedDB'
import { MemberValue, SplitOverride } from '../../domain/model/transaction'
import UnconfirmedTransaction, {
  UnconfirmedTransactionUpdatableFields,
} from '../../domain/model/unconfirmedTransaction'
import { IdIdentifier } from '../../domain/model/Unique'

export default class UnconfirmedTransactionLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<UnconfirmedTransaction[]> {
    const unconfirmedTransactions = await this.db.unconfirmedTransactions.toCollection().toArray()
    return unconfirmedTransactions.map(
      (unconfirmedTransaction) =>
        new UnconfirmedTransaction(
          unconfirmedTransaction.id,
          unconfirmedTransaction.transactionGroupId,
          unconfirmedTransaction.owner,
          unconfirmedTransaction.createdBy,
          unconfirmedTransaction.amount,
          unconfirmedTransaction.date,
          unconfirmedTransaction.note,
          unconfirmedTransaction.splitOverride
            ? new SplitOverride(
                unconfirmedTransaction.splitOverride.splitTypeOverride,
                unconfirmedTransaction.splitOverride.memberValues.map((mv) => new MemberValue(mv.email, mv.value)),
              )
            : null,
        ),
    )
  }

  public async create(data: UnconfirmedTransactionUpdatableFields): Promise<UnconfirmedTransaction> {
    const newID = await this.db.unconfirmedTransactions.put({
      transactionGroupId: data.transactionGroupId,
      owner: data.owner,
      createdBy: data.createdBy,
      amount: data.amount,
      date: data.date,
      note: data.note,
      splitOverride: data.splitOverride,
    })

    return new UnconfirmedTransaction(
      newID,
      data.transactionGroupId,
      data.owner,
      data.createdBy,
      data.amount,
      data.date,
      data.note,
      data.splitOverride,
    )
  }

  public async createKnown(data: UnconfirmedTransaction): Promise<void> {
    await this.db.unconfirmedTransactions.put({
      id: data.id,
      transactionGroupId: data.transactionGroupId,
      owner: data.owner,
      createdBy: data.createdBy,
      amount: data.amount,
      date: data.date,
      note: data.note,
      splitOverride: data.splitOverride,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<UnconfirmedTransactionUpdatableFields>): Promise<void> {
    await this.db.unconfirmedTransactions.update(identity.id, {
      transactionGroupId: data.transactionGroupId,
      owner: data.owner,
      createdBy: data.createdBy,
      amount: data.amount,
      date: data.date,
      note: data.note,
      splitOverride: data.splitOverride,
    })
  }

  public async delete(identity: IdIdentifier): Promise<void> {
    await this.db.unconfirmedTransactions.delete(identity.id)
  }

  public async sync(unconfirmedTransactions: UnconfirmedTransaction[]): Promise<void> {
    await this.db.unconfirmedTransactions.clear()
    await this.db.unconfirmedTransactions.bulkPut(
      unconfirmedTransactions.map((unconfirmedTransaction) => ({
        id: unconfirmedTransaction.id,
        transactionGroupId: unconfirmedTransaction.transactionGroupId,
        owner: unconfirmedTransaction.owner,
        createdBy: unconfirmedTransaction.createdBy,
        amount: unconfirmedTransaction.amount,
        date: unconfirmedTransaction.date,
        note: unconfirmedTransaction.note,
        splitOverride: unconfirmedTransaction.splitOverride,
      })),
    )
  }
}
