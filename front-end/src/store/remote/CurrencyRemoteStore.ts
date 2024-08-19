import { RpcTransport } from "@protobuf-ts/runtime-rpc"
import Currency from "../../domain/model/currency"
import { CurrencyConverter } from "./converter/currencyConverter"
import {
  CreateCurrencyRequest,
  GetAllCurrenciesRequest,
  SetDefaultCurrencyRequest,
  UpdateCurrencyRequest,
} from "./dto/currency"
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
      ...data,
    })).response
    return new Currency(response.id, data.name, data.symbol, data.decimalPoints)
  }

  public async update(id: number, data: Omit<Currency, "id">): Promise<void> {
    await this.client.updateCurrency(UpdateCurrencyRequest.create({
      currency: conv.toDTO({id, ...data}),
    })).response
  }

  public async setDefault(id: number): Promise<void> {
    await this.client.setDefaultCurrency(SetDefaultCurrencyRequest.create({currencyId: id})).response
  }
}
