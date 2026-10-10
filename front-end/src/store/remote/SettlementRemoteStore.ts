import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { formatDateTime } from './converter/transactionConverter'
import {
  ConfirmSettlementRequest,
  CreateSettlementRequest,
  DeleteSettlementRequest,
  GetAllSettlementsRequest,
  PersonalTransactionFields as PersonalTransactionFieldsDto,
  RecordSettlementTransactionRequest,
  Settlement as SettlementDto,
  UpdateSettlementRequest,
} from './dto/settlement'
import { SettlementServiceClient } from './dto/settlement.client'
import Settlement, { SettlementID, SettlementUpdatableFields } from '../../domain/model/settlement'
import { Email, TransactionGroupID } from '../../domain/model/transactionGroup'
import { PromotionFields } from '../../domain/model/unconfirmedTransaction'
import { IdIdentifier } from '../../domain/model/Unique'

const toModel = (dto: SettlementDto) =>
  new Settlement(
    dto.id,
    dto.transactionGroup,
    dto.amount,
    new Date(dto.date),
    dto.note,
    dto.payer,
    dto.receiver,
    dto.createdBy,
    dto.proposedBy,
    dto.completed,
    dto.ownTransaction ?? null,
  )

const personalToDto = (fields: PromotionFields | null) =>
  fields
    ? PersonalTransactionFieldsDto.create({
        amount: fields.amount,
        currency: fields.currencyId,
        sender: fields.senderId ?? undefined,
        receiver: fields.receiverId ?? undefined,
        category: fields.categoryId ?? undefined,
        date: formatDateTime(fields.date),
        note: fields.note,
        receiverCurrency: fields.receiverCurrencyId,
        receiverAmount: fields.receiverAmount,
      })
    : undefined

export interface NewSettlement extends SettlementUpdatableFields {
  transactionGroupId: TransactionGroupID
  payer: Email
  receiver: Email
}

export default class SettlementRemoteStore {
  private client: SettlementServiceClient

  constructor(transport: RpcTransport) {
    this.client = new SettlementServiceClient(transport)
  }

  public async getAll(): Promise<Settlement[]> {
    const response = await this.client.getAllSettlements(GetAllSettlementsRequest.create()).response
    return response.settlements.map(toModel)
  }

  public async create(): Promise<Settlement> {
    throw new Error('use createSettlement')
  }

  public async update(): Promise<void> {
    throw new Error('use updateSettlement')
  }

  public async delete(identity: IdIdentifier): Promise<void> {
    await this.client.deleteSettlement(DeleteSettlementRequest.create({ id: identity.id })).response
  }

  public async createSettlement(settlement: NewSettlement, own: PromotionFields | null): Promise<void> {
    await this.client.createSettlement(
      CreateSettlementRequest.create({
        transactionGroup: settlement.transactionGroupId,
        amount: settlement.amount,
        date: formatDateTime(settlement.date),
        note: settlement.note,
        payer: settlement.payer,
        receiver: settlement.receiver,
        ownTransaction: personalToDto(own),
      }),
    ).response
  }

  public async updateSettlement(
    id: SettlementID,
    fields: SettlementUpdatableFields,
    own: PromotionFields | null,
  ): Promise<void> {
    await this.client.updateSettlement(
      UpdateSettlementRequest.create({
        id,
        amount: fields.amount,
        date: formatDateTime(fields.date),
        note: fields.note,
        ownTransaction: personalToDto(own),
      }),
    ).response
  }

  public async confirmSettlement(id: SettlementID, own: PromotionFields | null): Promise<void> {
    await this.client.confirmSettlement(ConfirmSettlementRequest.create({ id, ownTransaction: personalToDto(own) }))
      .response
  }

  public async recordSettlementTransaction(id: SettlementID, own: PromotionFields): Promise<void> {
    await this.client.recordSettlementTransaction(
      RecordSettlementTransactionRequest.create({ id, ownTransaction: personalToDto(own) }),
    ).response
  }
}
