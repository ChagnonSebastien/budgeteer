import { BudgeteerDB } from './indexedDb/db'
import Category, { CategoryUpdatableFields } from '../../domain/model/category'
import { IdIdentifier } from '../../domain/model/Unique'

export default class CategoryLocalStore {
  private db: BudgeteerDB

  constructor(db: BudgeteerDB) {
    this.db = db
  }

  public async getAll(): Promise<Category[]> {
    const categories: Category[] = []
    await this.db.categories.each((category) => {
      categories.push(
        new Category(
          category.id,
          category.name,
          category.iconName,
          category.iconColor,
          category.iconBackground,
          category.parentId,
          category.fixedCosts,
          category.ordering,
        ),
      )
    })
    return categories
  }

  public async create(data: CategoryUpdatableFields): Promise<Category> {
    const newID = await this.db.categories.add({
      ordering: data.ordering,
      fixedCosts: data.fixedCosts,
      parentId: data.parentId,
      iconBackground: data.iconBackground,
      iconColor: data.iconColor,
      name: data.name,
      iconName: data.iconName,
    })

    return new Category(
      newID,
      data.name,
      data.iconName,
      data.iconColor,
      data.iconBackground,
      data.parentId,
      data.fixedCosts,
      data.ordering,
    )
  }

  public async createKnown(data: Category): Promise<void> {
    await this.db.categories.add({
      id: data.id,
      ordering: data.ordering,
      fixedCosts: data.fixedCosts,
      parentId: data.parentId,
      iconBackground: data.iconBackground,
      iconColor: data.iconColor,
      name: data.name,
      iconName: data.iconName,
    })
  }

  public async update(identity: IdIdentifier, data: Partial<CategoryUpdatableFields>): Promise<void> {
    await this.db.categories.update(identity.id, {
      ordering: data.ordering,
      fixedCosts: data.fixedCosts,
      parentId: data.parentId,
      iconBackground: data.iconBackground,
      iconColor: data.iconColor,
      name: data.name,
      iconName: data.iconName,
    })
  }

  public async sync(categories: Category[]): Promise<void> {
    await this.db.categories.clear()
    await Promise.all(
      categories.map((category) =>
        this.db.categories.add({
          id: category.id,
          ordering: category.ordering,
          fixedCosts: category.fixedCosts,
          parentId: category.parentId,
          iconBackground: category.iconBackground,
          iconColor: category.iconColor,
          name: category.name,
          iconName: category.iconName,
        }),
      ),
    )
  }
}
