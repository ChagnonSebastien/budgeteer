import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Account from "../../domain/model/account"
import { AccountConverter } from "./converter/accountConverter"
import { CreateAccountRequest, GetAllAccountsRequest } from "./dto/account"
import { AccountServiceClient } from "./dto/account.client"

const conv = new AccountConverter()

export default class AccountRemoteStore {

  private client: AccountServiceClient

  constructor(transport: RpcTransport) {
    this.client = new AccountServiceClient(transport)
  }

  public async getAll(): Promise<Account[]> {
    const response = await this.client.getAllAccounts(GetAllAccountsRequest.create()).response
    return await Promise.all(response.accounts.map<Promise<Account>>(dto => conv.toModel(dto)))
  }

  public async create(data: Omit<Account, "id">): Promise<Account> {
    const response = await this.client.createAccount(CreateAccountRequest.create({
      name: data.name,
      initialAmount: data.initialAmount,
    })).response
    return new Account(response.id, data.name, data.initialAmount)
  }
}
