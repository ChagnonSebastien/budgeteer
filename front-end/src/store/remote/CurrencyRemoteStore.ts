import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { CurrencyConverter } from './converter/currencyConverter'
import {
  CreateCurrencyRequest,
  GetAllCurrenciesRequest,
  SetDefaultCurrencyRequest,
  UpdateCurrencyRequest,
} from './dto/currency'
import { CurrencyServiceClient } from './dto/currency.client'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../domain/model/currency'
import { IdIdentifier } from '../../domain/model/Unique'

const conv = new CurrencyConverter()

export default class CurrencyRemoteStore {
  private client: CurrencyServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CurrencyServiceClient(transport)
  }

  public async getAll(): Promise<Currency[]> {
    const response = await this.client.getAllCurrencies(GetAllCurrenciesRequest.create()).response
    return response.currencies.map<Currency>((dto) => conv.toModel(dto))
  }

  public async create(data: CurrencyUpdatableFields): Promise<Currency> {
    const response = await this.client.createCurrency(CreateCurrencyRequest.create(conv.toUpdateDTO(data))).response

    const rateAutoupdateSettings = new RateAutoupdateSettings(
      data.rateAutoupdateSettings.script,
      data.rateAutoupdateSettings.enabled,
    )

    return new Currency(
      response.currencyId,
      data.name,
      data.symbol,
      data.risk,
      data.type,
      data.decimalPoints,
      rateAutoupdateSettings,
    )
  }

  public async update(identity: IdIdentifier, data: Partial<CurrencyUpdatableFields>): Promise<void> {
    await this.client.updateCurrency(
      UpdateCurrencyRequest.create({
        id: identity.id,
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }

  public async setDefault(id: number): Promise<void> {
    await this.client.setDefaultCurrency(SetDefaultCurrencyRequest.create({ currencyId: id })).response
  }
}
