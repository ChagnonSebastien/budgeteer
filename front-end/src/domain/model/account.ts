import Unique from "./Unique"

export default class Account implements Unique {
  readonly id: number
  readonly name: string
  readonly initialAmount: number

  constructor(id: number, name: string, initialAmount: number) {
    this.id = id
    this.name = name
    this.initialAmount = initialAmount
  }
}