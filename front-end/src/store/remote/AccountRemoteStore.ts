import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Account, { Balance } from "../../domain/model/account"
import { AccountConverter } from "./converter/accountConverter"
import { CreateAccountRequest, CurrencyBalance, GetAllAccountsRequest, UpdateAccountRequest } from "./dto/account"
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
      ...data,
      balances: data.initialAmounts.map((ia =>
          CurrencyBalance.create({
            currencyId: ia.currencyId,
            amount: ia.value,
          })
      )),
    })).response
    return new Account(response.id, data.name, data.initialAmounts.map(value => new Balance(value.currencyId, value.value)), data.isMine)
  }

  public async update(id: number, data: Omit<Account, "id">): Promise<void> {
    await this.client.updateAccount(UpdateAccountRequest.create({
      account: conv.toDTO({id, ...data}),
    })).response
  }
}
