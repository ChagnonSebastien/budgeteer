import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Transaction from "../../domain/model/transaction"
import { formatDateTime, TransactionConverter } from "./converter/transactionConverter"
import { CreateTransactionRequest, GetAllTransactionsRequest, UpdateTransactionRequest } from "./dto/transaction"
import { TransactionServiceClient } from "./dto/transaction.client"

const conv = new TransactionConverter()

export default class TransactionRemoteStore {

  private client: TransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new TransactionServiceClient(transport)
  }

  public async getAll(): Promise<Transaction[]> {
    const response = await this.client.getAllTransactions(GetAllTransactionsRequest.create()).response
    return await Promise.all(response.transactions.map<Promise<Transaction>>(dto => conv.toModel(dto)))
  }

  public async create(data: Omit<Transaction, "id">): Promise<Transaction> {
    const response = await this.client.createTransaction(CreateTransactionRequest.create({
      amount: data.amount,
      category: data.categoryId ?? undefined,
      date: formatDateTime(data.date),
      currency: data.currencyId,
      note: data.note,
      sender: data.senderId ?? undefined,
      receiver: data.receiverId ?? undefined,
    })).response
    return new Transaction(
      response.id,
      data.amount,
      data.currencyId,
      data.categoryId,
      data.date,
      data.senderId,
      data.receiverId,
      data.note,
    )
  }

  public async update(id: number, data: Omit<Transaction, "id">): Promise<void> {
    const {date, senderId, receiverId, ...remainder} = data
    await this.client.updateTransaction(UpdateTransactionRequest.create({
      transaction: conv.toDTO({id, ...data}),
    })).response
  }
}
