import NamedItem from './NamedItem'

export type CategoryID = number

export default class Category implements NamedItem<CategoryID, Category> {
  constructor(
    public readonly id: CategoryID,
    public name: string,
    public iconName: string,
    public iconColor: string,
    public iconBackground: string,
    public parentId: CategoryID | null,
    public fixedCosts: boolean,
    public ordering: number,
  ) {}

  hasName(name: string): boolean {
    return this.name.toLowerCase() === name.toLowerCase()
  }

  equals(other: Category): boolean {
    if (this.id !== other.id) return false
    if (this.name !== other.name) return false
    if (this.iconName !== other.iconName) return false
    if (this.iconColor !== other.iconColor) return false
    if (this.iconBackground !== other.iconBackground) return false
    if (this.parentId !== other.parentId) return false
    if (this.fixedCosts !== other.fixedCosts) return false
    return this.ordering === other.ordering
  }
}

export class AugmentedCategory extends Category {
  constructor(
    category: Category,
    public readonly parent?: Category,
  ) {
    super(
      category.id,
      category.name,
      category.iconName,
      category.iconColor,
      category.iconBackground,
      category.parentId,
      category.fixedCosts,
      category.ordering,
    )
  }
}

export type CategoryUpdatableFields = Pick<
  Category,
  'iconBackground' | 'iconColor' | 'iconName' | 'name' | 'fixedCosts' | 'ordering' | 'parentId'
>
