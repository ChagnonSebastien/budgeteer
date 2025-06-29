import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { AccountConverter } from './converter/accountConverter'
import { CreateAccountRequest, CurrencyBalance, GetAllAccountsRequest, UpdateAccountRequest } from './dto/account'
import { AccountServiceClient } from './dto/account.client'
import Account, { AccountUpdatableFields, Balance } from '../../domain/model/account'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new AccountConverter()

export default class AccountRemoteStore {
  private client: AccountServiceClient

  constructor(transport: RpcTransport) {
    this.client = new AccountServiceClient(transport)
  }

  public async getAll(): Promise<Account[]> {
    const response = await this.client.getAllAccounts(GetAllAccountsRequest.create()).response
    return response.accounts.map<Account>((dto) => conv.toModel(dto))
  }

  public async create(data: AccountUpdatableFields): Promise<Account> {
    const response = await this.client.createAccount(
      CreateAccountRequest.create({
        ...data,
        balances: data.initialAmounts.map((ia) =>
          CurrencyBalance.create({
            currencyId: ia.currencyId,
            amount: ia.value,
          }),
        ),
        type: data.type ?? undefined,
        financialInstitution: data.financialInstitution ?? undefined,
      }),
    ).response
    return new Account(
      response.id,
      data.name,
      data.initialAmounts.map((value) => new Balance(value.currencyId, value.value)),
      data.isMine,
      data.type,
      data.financialInstitution,
    )
  }

  public async update(identity: IdIdentifier, data: Partial<AccountUpdatableFields>): Promise<void> {
    await this.client.updateAccount(
      UpdateAccountRequest.create({
        id: identity.id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }
}
