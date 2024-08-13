import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Category from "../../domain/model/category"
import { CategoryConverter } from "./converter/categoryConverter"
import { CreateCategoryRequest, GetAllCategoriesRequest } from "./dto/category"
import { CategoryServiceClient } from "./dto/category.client"

const conv = new CategoryConverter()

export default class CategoryRemoteStore {

  private client: CategoryServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CategoryServiceClient(transport)
  }

  public async getAll(): Promise<Category[]> {
    const response = await this.client.getAllCategories(GetAllCategoriesRequest.create()).response
    return await Promise.all(response.categories.map<Promise<Category>>(dto => conv.toModel(dto)))
  }

  public async create(data: Omit<Category, "id">): Promise<Category> {
    const response = await this.client.createCategory(CreateCategoryRequest.create({
      name: data.name,
      iconName: data.iconName,
      parentId: data.parentId ?? undefined,
      iconBackground: data.iconBackground,
      iconColor: data.iconColor,
    })).response
    return new Category(response.id, data.name, data.iconName, data.iconColor, data.iconBackground, data.parentId)
  }
}
