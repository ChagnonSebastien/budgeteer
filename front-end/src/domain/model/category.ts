import Unique from './Unique'

export type AugmentedCategory = Category & {
  readonly parent?: Category
}

export default class Category implements Unique {
  readonly id: number
  name: string
  iconName: string
  iconColor: string
  iconBackground: string
  parentId: number | null
  fixedCosts: boolean

  constructor(
    id: number,
    name: string,
    iconName: string,
    iconColor: string,
    iconBackground: string,
    parentId: number | null,
    fixedCosts: boolean,
  ) {
    this.id = id
    this.name = name
    this.iconName = iconName
    this.parentId = parentId
    this.iconColor = iconColor
    this.iconBackground = iconBackground
    this.fixedCosts = fixedCosts
  }
}
