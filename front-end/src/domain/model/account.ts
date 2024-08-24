import Unique from './Unique'

export class Balance {
  constructor(
    public readonly currencyId: number,
    public readonly value: number,
  ) {}
}

export default class Account implements Unique {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly initialAmounts: Balance[],
    public readonly isMine: boolean,
  ) {}
}
