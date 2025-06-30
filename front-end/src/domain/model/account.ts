import NamedItem from './NamedItem'

export class Balance {
  constructor(
    public readonly currencyId: number,
    public readonly value: number,
  ) {}

  equals(other: Balance): boolean {
    if (this.currencyId !== other.currencyId) return false
    return this.value === other.value
  }
}

export type AccountID = number

export default class Account implements NamedItem<AccountID, Account> {
  constructor(
    public readonly id: AccountID,
    public readonly name: string,
    public readonly initialAmounts: Balance[],
    public readonly isMine: boolean,
    public readonly type: string,
    public readonly financialInstitution: string,
  ) {}

  hasName(name: string): boolean {
    return this.name.toLowerCase() === name.toLowerCase()
  }

  equals(other: Account): boolean {
    if (this.id !== other.id) return false
    if (this.name !== other.name) return false
    if (this.isMine !== other.isMine) return false
    if (this.type !== other.type) return false
    if (this.financialInstitution !== other.financialInstitution) return false
    if (this.initialAmounts.length !== other.initialAmounts.length) return false
    for (let i = 0; i < this.initialAmounts.length; i += 1) {
      if (!this.initialAmounts[i].equals(other.initialAmounts[i])) return false
    }
    return true
  }
}

export type AccountUpdatableFields = Pick<
  Account,
  'name' | 'initialAmounts' | 'type' | 'financialInstitution' | 'isMine'
>
