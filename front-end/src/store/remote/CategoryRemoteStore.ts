import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { CategoryConverter } from './converter/categoryConverter'
import {
  CreateCategoryRequest,
  DeleteCategoryRequest,
  GetAllCategoriesRequest,
  UpdateCategoryRequest,
} from './dto/category'
import { CategoryServiceClient } from './dto/category.client'
import Category, {
  CategoryDeletionOptions,
  CategoryDeletionResult,
  CategoryID,
  CategoryUpdatableFields,
} from '../../domain/model/category'
import { IdIdentifier } from '../../domain/model/Unique'

const converter = new CategoryConverter()

export default class CategoryRemoteStore {
  private client: CategoryServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CategoryServiceClient(transport)
  }

  public async getAll(): Promise<Category[]> {
    const response = await this.client.getAllCategories(GetAllCategoriesRequest.create()).response
    return response.categories.map<Category>((dto) => converter.toModel(dto))
  }

  public async create(data: CategoryUpdatableFields): Promise<Category> {
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

  public async update(identity: IdIdentifier, data: Partial<CategoryUpdatableFields>): Promise<void> {
    await this.client.updateCategory(
      UpdateCategoryRequest.create({
        id: identity.id,
        fields: converter.toUpdateDTO(data),
      }),
    ).response
  }

  public async deleteCategory(id: CategoryID, options: CategoryDeletionOptions): Promise<CategoryDeletionResult> {
    const response = await this.client.deleteCategory(
      DeleteCategoryRequest.create({
        id,
        targetId: options.targetId,
        deleteTransactions: options.deleteTransactions ?? false,
      }),
    ).response
    return {
      movedTransactions: response.movedTransactions,
      movedCategories: response.movedCategories,
      deletedTransactions: response.deletedTransactions,
      movedToUnconfirmed: response.movedToUnconfirmed,
    }
  }
}
