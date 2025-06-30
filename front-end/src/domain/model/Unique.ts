export default interface Unique<T, TSelf extends Unique<T, TSelf>> {
  get id(): T
  equals(other: TSelf): boolean
}

export interface IdIdentifier {
  id: number
}
