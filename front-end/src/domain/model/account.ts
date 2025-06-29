import NamedItem from './NamedItem'

export class Balance {
  constructor(
    public readonly currencyId: number,
    public readonly value: number,
  ) {}
}

export type AccountID = number

export default class Account implements NamedItem<AccountID> {
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
}

export type AccountUpdatableFields = Pick<
  Account,
  'name' | 'initialAmounts' | 'type' | 'financialInstitution' | 'isMine'
>
