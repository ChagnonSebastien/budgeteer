import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Currency from "../domain/model/currency"
import { CurrencyConverter } from "../messaging/converter/currencyConverter"
import { GetAllCurrenciesRequest } from "../messaging/dto/currency"
import { CurrencyServiceClient } from "../messaging/dto/currency.client"

const conv = new CurrencyConverter()

export default class CurrencyRepository {

  private client: CurrencyServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CurrencyServiceClient(transport)
  }

  async getAll(): Promise<Currency[]> {
    const response = await this.client.getAllCurrencies(GetAllCurrenciesRequest.create()).response
    return await Promise.all(response.currencies.map<Promise<Currency>>(dto => conv.toModel(dto)))
  }
}
