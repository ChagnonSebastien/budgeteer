import Unique from './Unique'

export default interface NamedItem extends Unique {
  hasName(name: string): boolean
}
