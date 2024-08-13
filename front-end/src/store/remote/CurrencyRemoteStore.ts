import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Currency from "../../domain/model/currency"
import { CurrencyConverter } from "./converter/currencyConverter"
import { CreateCurrencyRequest, GetAllCurrenciesRequest } from "./dto/currency"
import { CurrencyServiceClient } from "./dto/currency.client"

const conv = new CurrencyConverter()

export default class CurrencyRemoteStore {

  private client: CurrencyServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CurrencyServiceClient(transport)
  }

  public async getAll(): Promise<Currency[]> {
    const response = await this.client.getAllCurrencies(GetAllCurrenciesRequest.create()).response
    return await Promise.all(response.currencies.map<Promise<Currency>>(dto => conv.toModel(dto)))
  }

  public async create(data: Omit<Currency, "id">): Promise<Currency> {
    const response = await this.client.createCurrency(CreateCurrencyRequest.create({
      name: data.name,
      symbol: data.symbol,
    })).response
    return new Currency(response.id, data.name, data.symbol)
  }
}
