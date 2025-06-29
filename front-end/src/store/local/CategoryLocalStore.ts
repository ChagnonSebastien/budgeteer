import RemoteStore from './IRemoteStore'
import Category, { CategoryUpdatableFields } from '../../domain/model/category'

export default class CategoryLocalStore {
  constructor(private remoteStore: RemoteStore<Category, CategoryUpdatableFields>) {}

  public async getAll(): Promise<Category[]> {
    return await this.remoteStore.getAll()
  }

  public async create(data: CategoryUpdatableFields): Promise<Category> {
    return await this.remoteStore.create(data)
  }

  public async update(id: number, data: Partial<CategoryUpdatableFields>): Promise<void> {
    await this.remoteStore.update(id, data)
  }
}
