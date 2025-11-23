import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { TransactionGroupConverter } from './converter/transactionGroupConverter'
import {
  CreateTransactionGroupRequest,
  GetAllTransactionGroupsRequest,
  UpdateTransactionGroupRequest,
} from './dto/transactionGroup'
import { TransactionGroupServiceClient } from './dto/transactionGroup.client'
import TransactionGroup from '../../domain/model/transactionGroup'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new TransactionGroupConverter()

export default class TransactionGroupRemoteStore {
  private client: TransactionGroupServiceClient

  constructor(transport: RpcTransport) {
    this.client = new TransactionGroupServiceClient(transport)
  }

  public async getAll(): Promise<TransactionGroup[]> {
    const response = await this.client.getAllTransactionGroups(GetAllTransactionGroupsRequest.create()).response
    return response.transactionGroups.map<TransactionGroup>((dto) => conv.toModel(dto))
  }

  public async create(data: Omit<TransactionGroup, 'id'>): Promise<TransactionGroup> {
    const response = await this.client.createTransactionGroup(
      CreateTransactionGroupRequest.create({
        name: data.name,
        initialCurrency: data.originalCurrency,
      }),
    ).response
    return new TransactionGroup(response.id, data.name, data.originalCurrency, data.splitType)
  }

  public async update(identity: IdIdentifier, data: Partial<Omit<TransactionGroup, 'id'>>): Promise<void> {
    await this.client.updateTransactionGroup(
      UpdateTransactionGroupRequest.create({
        id: identity.id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }
}
