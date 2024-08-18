import Unique from "./Unique"

export default class Currency implements Unique {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly symbol: string,
    public readonly decimalPoints: number,
  ) {
  }
}