import Unique from './Unique'

export default interface NamedItem<T, TSelf extends Unique<T, TSelf>> extends Unique<T, TSelf> {
  hasName(name: string): boolean
}
