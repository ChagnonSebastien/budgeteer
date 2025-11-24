import { BudgeteerDB, SplitType as SplitTypeDto } from './IndexedDB'
import TransactionGroup, {
  Member,
  SplitType,
  TransactionGroupUpdatableFields,
} from '../../domain/model/transactionGroup'
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
          splitTypeFromLocalStore(transactionGroup.splitType),
          transactionGroup.members.map((member) => new Member(member.email, member.name, member.splitValue)),
          transactionGroup.currency,
          transactionGroup.category,
        ),
    )
  }

  public async create(data: Omit<TransactionGroup, 'id' | 'members'>): Promise<TransactionGroup> {
    const newID = await this.db.transactionGroups.put({
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: splitTypeToLocalStore(data.splitType),
      members: [{ email: this.userEmail, name: this.userName, splitValue: 1 }],
      currency: data.currency,
      category: data.category,
    })

    return new TransactionGroup(
      newID,
      data.name,
      data.originalCurrency,
      data.splitType,
      [new Member(this.userEmail, this.userName, 1)],
      data.currency,
      data.category,
    )
  }

  public async createKnown(data: TransactionGroup): Promise<void> {
    await this.db.transactionGroups.put({
      id: data.id,
      name: data.name,
      originalCurrency: data.originalCurrency,
      splitType: splitTypeToLocalStore(data.splitType),
      members: data.members,
      currency: data.currency,
      category: data.category,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<TransactionGroupUpdatableFields>): Promise<void> {
    await this.db.transactionGroups.update(identity.id, {
      name: data.name,
      splitType: data.splitType ? splitTypeToLocalStore(data.splitType) : undefined,
      category: data.category,
      currency: data.currency,
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
        members: transactionGroup.members,
        currency: transactionGroup.currency,
        category: transactionGroup.category,
      })),
    )
  }
}
