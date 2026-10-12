import { BudgeteerDB } from './IndexedDB'
import Account, { AccountUpdatableFields, Balance } from '../../domain/model/account'
import { IdIdentifier } from '../../domain/model/Unique'

export default class AccountLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Account[]> {
    const accounts = await this.db.accounts.toCollection().toArray()
    return accounts.map(
      (account) =>
        new Account(
          account.id,
          account.name,
          account.initialAmounts.map((ia) => new Balance(ia.currencyId, ia.value)),
          account.isMine,
          account.type,
          account.financialInstitution,
          account.isDebt,
          account.createdAt,
          account.statementNames,
        ),
    )
  }

  public async create(data: AccountUpdatableFields): Promise<Account> {
    const newID = await this.db.accounts.put({
      initialAmounts: data.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
      isDebt: data.isDebt,
    })

    return new Account(
      newID,
      data.name,
      data.initialAmounts,
      data.isMine,
      data.type,
      data.financialInstitution,
      data.isDebt,
    )
  }

  public async createKnown(data: Account): Promise<void> {
    await this.db.accounts.put({
      id: data.id,
      initialAmounts: data.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
      isDebt: data.isDebt,
      createdAt: data.createdAt,
      statementNames: data.statementNames,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<AccountUpdatableFields>): Promise<void> {
    await this.db.accounts.update(identity.id, {
      initialAmounts: data.initialAmounts?.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
      isDebt: data.isDebt,
    })
  }

  public async sync(accounts: Account[]): Promise<void> {
    await this.db.accounts.clear()
    await this.db.accounts.bulkPut(
      accounts.map((account) => ({
        id: account.id,
        initialAmounts: account.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
        type: account.type,
        name: account.name,
        isMine: account.isMine,
        financialInstitution: account.financialInstitution,
        isDebt: account.isDebt,
        createdAt: account.createdAt,
        statementNames: account.statementNames,
      })),
    )
  }
}
