import Unique from "./Unique"

export default class Category implements Unique {
  readonly id: number
  readonly name: string
  readonly iconName: string
  readonly parentId: number | null

  constructor(id: number, name: string, iconName: string, parentId: number | null) {
    this.id = id
    this.name = name
    this.iconName = iconName
    this.parentId = parentId
  }
}