import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { splitTypeOverrideToDto } from './converter/transactionConverter'
import { splitTypeToDto, TransactionGroupConverter } from './converter/transactionGroupConverter'
import { MemberSplitValue as MemberSplitValueDto, SplitOverride as SplitOverrideDto } from './dto/transaction'
import {
  ChangeTransactionGroupSplitRequest,
  CreateTransactionGroupRequest,
  GetAllTransactionGroupsRequest,
  SetGroupedTransactionSplitRequest,
  SplitChangeScope as SplitChangeScopeDto,
  UpdateTransactionGroupRequest,
} from './dto/transactionGroup'
import { TransactionGroupServiceClient } from './dto/transactionGroup.client'
import { SplitOverride, TransactionID } from '../../domain/model/transaction'
import TransactionGroup, {
  MemberSplitValues,
  Person,
  SplitChangeScope,
  SplitType,
  TransactionGroupID,
} from '../../domain/model/transactionGroup'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new TransactionGroupConverter()

const splitChangeScopeToDto = (scope: SplitChangeScope): SplitChangeScopeDto => {
  switch (scope) {
    case SplitChangeScope.ALL_TRANSACTIONS:
      return SplitChangeScopeDto.AllTransactions
    case SplitChangeScope.TRANSACTIONS_WITHOUT_CUSTOM_SPLIT:
      return SplitChangeScopeDto.TransactionsWithoutCustomSplit
    case SplitChangeScope.FUTURE_TRANSACTIONS:
      return SplitChangeScopeDto.FutureTransactions
  }
}

export default class TransactionGroupRemoteStore {
  private client: TransactionGroupServiceClient

  constructor(
    private userEmail: string,
    private userName: string,
    transport: RpcTransport,
  ) {
    this.client = new TransactionGroupServiceClient(transport)
  }

  public async getAll(): Promise<TransactionGroup[]> {
    const response = await this.client.getAllTransactionGroups(GetAllTransactionGroupsRequest.create()).response
    return response.transactionGroups.map<TransactionGroup>((dto) => conv.toModel(dto))
  }

  public async create(data: Omit<TransactionGroup, 'id' | 'members'>): Promise<TransactionGroup> {
    const response = await this.client.createTransactionGroup(
      CreateTransactionGroupRequest.create({
        name: data.name,
        splitType: splitTypeToDto(data.splitType),
        currency: data.currency ?? undefined,
        category: data.category ?? undefined,
      }),
    ).response
    return new TransactionGroup(
      response.id,
      data.name,
      data.originalCurrency,
      data.splitType,
      [new Person(this.userEmail, this.userName, null, true)],
      data.currency,
      data.category,
      data.hidden,
    )
  }

  public async changeSplit(
    id: TransactionGroupID,
    splitType: SplitType,
    memberValues: MemberSplitValues,
    scope: SplitChangeScope,
  ): Promise<void> {
    await this.client.changeTransactionGroupSplit(
      ChangeTransactionGroupSplitRequest.create({
        id,
        splitType: splitTypeToDto(splitType),
        members: [...memberValues].map(([email, value]) => ({ email, splitValue: value ?? undefined })),
        scope: splitChangeScopeToDto(scope),
      }),
    ).response
  }

  public async setTransactionSplit(transactionId: TransactionID, splitOverride: SplitOverride | null): Promise<void> {
    await this.client.setGroupedTransactionSplit(
      SetGroupedTransactionSplitRequest.create({
        transactionId,
        splitOverride: splitOverride
          ? SplitOverrideDto.create({
              splitTypeOverride: splitTypeOverrideToDto(splitOverride.splitTypeOverride),
              memberSplitValues: splitOverride.memberValues.map((m) =>
                MemberSplitValueDto.create({ email: m.email, splitValue: m.value ?? undefined }),
              ),
            })
          : undefined,
      }),
    ).response
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
