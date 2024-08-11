import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Category from "../domain/model/category"
import { CategoryConverter } from "../messaging/converter/categoryConverter"
import { GetAllCategoriesRequest } from "../messaging/dto/category"
import { CategoryServiceClient } from "../messaging/dto/category.client"

const conv = new CategoryConverter()

export default class CategoryRepository {

  private client: CategoryServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CategoryServiceClient(transport)
  }

  async getAll(): Promise<Category[]> {
    const response = await this.client.getAllCategories(GetAllCategoriesRequest.create()).response
    return await Promise.all(response.categories.map<Promise<Category>>(dto => conv.toModel(dto)))
  }
}
