import { BudgeteerDB, SplitType as SplitTypeDto } from './IndexedDB'
import TransactionGroup, { SplitType, TransactionGroupUpdatableFields } from '../../domain/model/transactionGroup'
import { IdIdentifier } from '../../domain/model/Unique'

const splitTypeToLocalStore = (type: SplitType): SplitTypeDto => {
  switch (type) {
    case SplitType.EQUAL:
      return 'equal'
    case SplitType.PERCENTAGE:
      return 'percentage'
    case SplitType.SHARES:
      return 'share'
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

const splitTypeFromLocalStore = (type: SplitTypeDto): SplitType => {
  switch (type) {
    case 'equal':
      return SplitType.EQUAL
    case 'percentage':
      return SplitType.PERCENTAGE
    case 'share':
      return SplitType.SHARES
    default:
      throw Error(`Invalid Split type: ${type}`)
  }
}

export default class TransactionGroupLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
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
          splitTypeFromLocalStore(transactionGroup.splitType),
        ),
    )
  }

  public async create(data: Omit<TransactionGroup, 'id'>): Promise<TransactionGroup> {
    const newID = await this.db.transactionGroups.put({
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: splitTypeToLocalStore(data.splitType),
    })

    return new TransactionGroup(newID, data.name, data.originalCurrency, data.splitType)
  }

  public async createKnown(data: TransactionGroup): Promise<void> {
    await this.db.transactionGroups.put({
      id: data.id,
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: splitTypeToLocalStore(data.splitType),
    })
  }

  public async update(identity: IdIdentifier, data: Partial<TransactionGroupUpdatableFields>): Promise<void> {
    await this.db.transactionGroups.update(identity.id, {
      name: data.name,
      splitType: data.splitType ? splitTypeToLocalStore(data.splitType) : undefined,
    })
  }

  public async sync(transactionGroups: TransactionGroup[]): Promise<void> {
    await this.db.transactionGroups.clear()
    await this.db.transactionGroups.bulkPut(
      transactionGroups.map((transactionGroup) => ({
        id: transactionGroup.id,
        name: transactionGroup.name,
        originalCurrency: transactionGroup.originalCurrency,
        splitType: splitTypeToLocalStore(transactionGroup.splitType),
      })),
    )
  }
}
