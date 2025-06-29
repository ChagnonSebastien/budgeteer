import Unique from './Unique'

export default interface NamedItem<T> extends Unique<T> {
  hasName(name: string): boolean
}
