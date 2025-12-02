import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { formatDateTime, splitTypeOverrideToDto, TransactionConverter } from './converter/transactionConverter'
import {
  CreateTransactionRequest,
  FinancialIncomeData,
  GetAllTransactionsRequest,
  MemberSplitValue,
  SplitOverride,
  TransactionGroupData,
  UpdateTransactionRequest,
} from './dto/transaction'
import { TransactionServiceClient } from './dto/transaction.client'
import Transaction from '../../domain/model/transaction'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new TransactionConverter()

export default class TransactionRemoteStore {
  private client: TransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new TransactionServiceClient(transport)
  }

  public async getAll(): Promise<Transaction[]> {
    const response = await this.client.getAllTransactions(GetAllTransactionsRequest.create()).response
    return response.transactions.map<Transaction>((dto) => conv.toModel(dto))
  }

  public async create(data: Omit<Transaction, 'id' | 'hasName'>): Promise<Transaction> {
    const response = await this.client.createTransaction(
      CreateTransactionRequest.create({
        owner: data.owner,
        amount: data.amount,
        category: data.categoryId ?? undefined,
        date: formatDateTime(data.date),
        currency: data.currencyId,
        note: data.note,
        sender: data.senderId ?? undefined,
        receiver: data.receiverId ?? undefined,
        receiverCurrency: data.receiverCurrencyId,
        receiverAmount: data.receiverAmount,
        financialIncomeData:
          data.financialIncomeData !== null
            ? FinancialIncomeData.create({
                relatedCurrency: data.financialIncomeData.relatedCurrencyId,
              })
            : undefined,
        transactionGroupData:
          data.transactionGroupData !== null
            ? TransactionGroupData.create({
                transactionGroup: data.transactionGroupData.transactionGroupId,
                splitOverride: data.transactionGroupData.splitOverride
                  ? SplitOverride.create({
                      splitTypeOverride: splitTypeOverrideToDto(
                        data.transactionGroupData.splitOverride.splitTypeOverride,
                      ),
                      memberSplitValues: data.transactionGroupData.splitOverride.memberValues.map((m) =>
                        MemberSplitValue.create({
                          email: m.email,
                          splitValue: m.value ?? undefined,
                        }),
                      ),
                    })
                  : undefined,
              })
            : undefined,
      }),
    ).response
    return new Transaction(
      response.id,
      data.owner,
      data.amount,
      data.currencyId,
      data.categoryId,
      data.date,
      data.senderId,
      data.receiverId,
      data.note,
      data.receiverCurrencyId,
      data.receiverAmount,
      data.financialIncomeData,
      data.transactionGroupData,
    )
  }

  public async update(identity: IdIdentifier, data: Partial<Omit<Transaction, 'id' | 'hasName'>>): Promise<void> {
    await this.client.updateTransaction(
      UpdateTransactionRequest.create({
        id: identity.id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }
}
