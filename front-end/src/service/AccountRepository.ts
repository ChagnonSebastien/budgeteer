import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Account from "../domain/model/account"
import { AccountConverter } from "../messaging/converter/accountConverter"
import { GetAllAccountsRequest } from "../messaging/dto/account"
import { AccountServiceClient } from "../messaging/dto/account.client"

const conv = new AccountConverter()

export default class AccountRepository {

  private client: AccountServiceClient

  constructor(transport: RpcTransport) {
    this.client = new AccountServiceClient(transport)
  }

  async getAll(): Promise<Account[]> {
    const response = await this.client.getAllAccounts(GetAllAccountsRequest.create()).response
    return await Promise.all(response.accounts.map<Promise<Account>>(dto => conv.toModel(dto)))
  }
}
