import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { formatDateTime } from './converter/transactionConverter'
import { splitOverrideToDto, UnconfirmedTransactionConverter } from './converter/unconfirmedTransactionConverter'
import {
  CreateUnconfirmedTransactionRequest,
  DeleteUnconfirmedTransactionRequest,
  GetAllUnconfirmedTransactionsRequest,
  PromoteUnconfirmedTransactionRequest,
  UpdateUnconfirmedTransactionRequest,
} from './dto/unconfirmedTransaction'
import { UnconfirmedTransactionServiceClient } from './dto/unconfirmedTransaction.client'
import { TransactionID } from '../../domain/model/transaction'
import UnconfirmedTransaction, {
  PromotionFields,
  UnconfirmedTransactionUpdatableFields,
} from '../../domain/model/unconfirmedTransaction'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new UnconfirmedTransactionConverter()

export default class UnconfirmedTransactionRemoteStore {
  private client: UnconfirmedTransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new UnconfirmedTransactionServiceClient(transport)
  }

  public async getAll(): Promise<UnconfirmedTransaction[]> {
    const response = await this.client.getAllUnconfirmedTransactions(GetAllUnconfirmedTransactionsRequest.create())
      .response
    return response.unconfirmedTransactions.map((dto) => conv.toModel(dto))
  }

  public async create(data: UnconfirmedTransactionUpdatableFields): Promise<UnconfirmedTransaction> {
    const response = await this.client.createUnconfirmedTransaction(
      CreateUnconfirmedTransactionRequest.create({
        transactionGroup: data.transactionGroupId,
        owner: data.owner,
        amount: data.amount,
        date: formatDateTime(data.date),
        note: data.note,
        splitOverride: splitOverrideToDto(data.splitOverride),
      }),
    ).response
    return new UnconfirmedTransaction(
      response.id,
      data.transactionGroupId,
      data.owner,
      data.createdBy,
      data.amount,
      data.date,
      data.note,
      data.splitOverride,
    )
  }

  public async update(identity: IdIdentifier, data: Partial<UnconfirmedTransactionUpdatableFields>): Promise<void> {
    await this.client.updateUnconfirmedTransaction(
      UpdateUnconfirmedTransactionRequest.create({
        id: identity.id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }

  public async delete(identity: IdIdentifier): Promise<void> {
    await this.client.deleteUnconfirmedTransaction(DeleteUnconfirmedTransactionRequest.create({ id: identity.id }))
      .response
  }

  public async promote(identity: IdIdentifier, data: PromotionFields): Promise<TransactionID> {
    const response = await this.client.promoteUnconfirmedTransaction(
      PromoteUnconfirmedTransactionRequest.create({
        id: identity.id,
        amount: data.amount,
        currency: data.currencyId,
        sender: data.senderId ?? undefined,
        receiver: data.receiverId ?? undefined,
        category: data.categoryId ?? undefined,
        date: formatDateTime(data.date),
        note: data.note,
        receiverCurrency: data.receiverCurrencyId,
        receiverAmount: data.receiverAmount,
      }),
    ).response
    return response.transactionId
  }
}
