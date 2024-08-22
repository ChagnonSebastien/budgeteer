import Unique from "./Unique"

export class ExchangeRate implements Unique {
  constructor(
    public readonly id: number,
    public readonly rate: number,
    public readonly date: string,
  ) {
  }
}

export default class Currency implements Unique {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly decimalPoints: number,
    public readonly exchangeRates: {[comparedTo: number]: ExchangeRate[]},
  ) {
  }
}