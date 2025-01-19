import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { CategoryConverter } from './converter/categoryConverter'
import { CreateCategoryRequest, GetAllCategoriesRequest, UpdateCategoryRequest } from './dto/category'
import { CategoryServiceClient } from './dto/category.client'
import Category from '../../domain/model/category'

const conv = new CategoryConverter()

export default class CategoryRemoteStore {
  private client: CategoryServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CategoryServiceClient(transport)
  }

  public async getAll(): Promise<Category[]> {
    const response = await this.client.getAllCategories(GetAllCategoriesRequest.create()).response
    return await Promise.all(response.categories.map<Promise<Category>>((dto) => conv.toModel(dto)))
  }

  public async create(data: Omit<Category, 'id'>): Promise<Category> {
    const { parentId, ...remainder } = data
    const response = await this.client.createCategory(
      CreateCategoryRequest.create({
        parentId: parentId ?? undefined,
        ...remainder,
      }),
    ).response
    return new Category(
      response.id,
      data.name,
      data.iconName,
      data.iconColor,
      data.iconBackground,
      data.parentId,
      data.fixedCosts,
      data.ordering,
    )
  }

  public async update(id: number, data: Omit<Category, 'id'>): Promise<void> {
    await this.client.updateCategory(
      UpdateCategoryRequest.create({
        category: conv.toDTO({ id, ...data }),
      }),
    ).response
  }
}
