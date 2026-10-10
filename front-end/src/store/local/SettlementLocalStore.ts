import { BudgeteerDB, Settlement as SettlementRow } from './IndexedDB'
import Settlement, { SettlementUpdatableFields } from '../../domain/model/settlement'
import { IdIdentifier } from '../../domain/model/Unique'

const toModel = (row: SettlementRow) =>
  new Settlement(
    row.id,
    row.transactionGroupId,
    row.amount,
    row.date,
    row.note,
    row.payer,
    row.receiver,
    row.createdBy,
    row.proposedBy,
    row.completed,
    row.ownTransactionId,
  )

const toRow = (settlement: Settlement): SettlementRow => ({
  id: settlement.id,
  transactionGroupId: settlement.transactionGroupId,
  amount: settlement.amount,
  date: settlement.date,
  note: settlement.note,
  payer: settlement.payer,
  receiver: settlement.receiver,
  createdBy: settlement.createdBy,
  proposedBy: settlement.proposedBy,
  completed: settlement.completed,
  ownTransactionId: settlement.ownTransactionId,
})

export default class SettlementLocalStore {
  constructor(private db: BudgeteerDB) {}

  public async getAll(): Promise<Settlement[]> {
    return (await this.db.settlements.toCollection().toArray()).map(toModel)
  }

  public async create(): Promise<Settlement> {
    throw new Error('settlements are created online only')
  }

  public async createKnown(settlement: Settlement): Promise<void> {
    await this.db.settlements.put(toRow(settlement))
  }

  public async update(identity: IdIdentifier, data: Partial<SettlementUpdatableFields>): Promise<void> {
    await this.db.settlements.update(identity.id, data)
  }

  public async delete(identity: IdIdentifier): Promise<void> {
    await this.db.settlements.delete(identity.id)
  }

  public async sync(settlements: Settlement[]): Promise<void> {
    await this.db.settlements.clear()
    await this.db.settlements.bulkPut(settlements.map(toRow))
  }
}
