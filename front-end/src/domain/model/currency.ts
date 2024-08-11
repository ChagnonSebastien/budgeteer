import Unique from "./Unique"

export default class Currency implements Unique {
  readonly id: number
  readonly name: string
  readonly symbol: string

  constructor(id: number, name: string, symbol: string) {
    this.id = id
    this.name = name
    this.symbol = symbol
  }
}