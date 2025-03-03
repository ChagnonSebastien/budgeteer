import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { formatDateTime, TransactionConverter } from './converter/transactionConverter'
import { CreateTransactionRequest, GetAllTransactionsRequest, UpdateTransactionRequest } from './dto/transaction'
import { TransactionServiceClient } from './dto/transaction.client'
import Transaction from '../../domain/model/transaction'

const conv = new TransactionConverter()

export default class TransactionRemoteStore {
  private client: TransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new TransactionServiceClient(transport)
  }

  public async getAll(): Promise<Transaction[]> {
    const response = await this.client.getAllTransactions(GetAllTransactionsRequest.create()).response
    return await Promise.all(response.transactions.map<Promise<Transaction>>((dto) => conv.toModel(dto)))
  }

  public async create(data: Omit<Transaction, 'id' | 'hasName'>): Promise<Transaction> {
    const response = await this.client.createTransaction(
      CreateTransactionRequest.create({
        amount: data.amount,
        category: data.categoryId ?? undefined,
        date: formatDateTime(data.date),
        currency: data.currencyId,
        note: data.note,
        sender: data.senderId ?? undefined,
        receiver: data.receiverId ?? undefined,
        receiverCurrency: data.receiverCurrencyId,
        receiverAmount: data.receiverAmount,
      }),
    ).response
    return new Transaction(
      response.id,
      data.amount,
      data.currencyId,
      data.categoryId,
      data.date,
      data.senderId,
      data.receiverId,
      data.note,
      data.receiverCurrencyId,
      data.receiverAmount,
    )
  }

  public async update(id: number, data: Partial<Omit<Transaction, 'id' | 'hasName'>>): Promise<void> {
    await this.client.updateTransaction(
      UpdateTransactionRequest.create({
        id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }
}
