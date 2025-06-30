import { BudgeteerDB } from './indexedDb/db'
import Account, { AccountUpdatableFields, Balance } from '../../domain/model/account'
import { IdIdentifier } from '../../domain/model/Unique'

export default class AccountLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Account[]> {
    const currencies: Account[] = []
    await this.db.accounts.each((currency) => {
      currencies.push(
        new Account(
          currency.id,
          currency.name,
          currency.initialAmounts.map((ia) => new Balance(ia.currencyId, ia.value)),
          currency.isMine,
          currency.type,
          currency.financialInstitution,
        ),
      )
    })
    return currencies
  }

  public async create(data: AccountUpdatableFields): Promise<Account> {
    const newID = await this.db.accounts.add({
      initialAmounts: data.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
    })

    return new Account(newID, data.name, data.initialAmounts, data.isMine, data.type, data.financialInstitution)
  }

  public async createKnown(data: Account): Promise<void> {
    await this.db.accounts.add({
      id: data.id,
      initialAmounts: data.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<AccountUpdatableFields>): Promise<void> {
    await this.db.accounts.update(identity.id, {
      initialAmounts: data.initialAmounts?.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
      type: data.type,
      name: data.name,
      isMine: data.isMine,
      financialInstitution: data.financialInstitution,
    })
  }

  public async sync(accounts: Account[]): Promise<void> {
    await this.db.accounts.clear()
    await Promise.all(
      accounts.map((account) =>
        this.db.accounts.add({
          id: account.id,
          initialAmounts: account.initialAmounts.map((ia) => ({ currencyId: ia.currencyId, value: ia.value })),
          type: account.type,
          name: account.name,
          isMine: account.isMine,
          financialInstitution: account.financialInstitution,
        }),
      ),
    )
  }
}
