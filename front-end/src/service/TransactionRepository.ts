import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Transaction from "../domain/model/transaction"
import { TransactionConverter } from "../messaging/converter/transactionConverter"
import { GetAllTransactionsRequest } from "../messaging/dto/transaction"
import { TransactionServiceClient } from "../messaging/dto/transaction.client"

const conv = new TransactionConverter()

export default class TransactionRepository {

  private client: TransactionServiceClient

  constructor(transport: RpcTransport) {
    this.client = new TransactionServiceClient(transport)
  }

  async getAll(): Promise<Transaction[]> {
    const response = await this.client.getAllTransactions(GetAllTransactionsRequest.create()).response
    return await Promise.all(response.transactions.map<Promise<Transaction>>(dto => conv.toModel(dto)))
  }
}
