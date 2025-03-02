import NamedItem from './NamedItem'

export class Balance {
  constructor(
    public readonly currencyId: number,
    public readonly value: number,
  ) {}
}

export default class Account implements NamedItem {
  constructor(
    public readonly id: number,
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
