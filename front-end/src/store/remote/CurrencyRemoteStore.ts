import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { CurrencyConverter } from './converter/currencyConverter'
import { formatDateTime } from './converter/transactionConverter'
import {
  CreateCurrencyRequest,
  GetAllCurrenciesRequest,
  InitialExchangeRate,
  SetDefaultCurrencyRequest,
  UpdateCurrencyRequest,
} from './dto/currency'
import { CurrencyServiceClient } from './dto/currency.client'
import Currency, { ExchangeRate } from '../../domain/model/currency'

const conv = new CurrencyConverter()

export default class CurrencyRemoteStore {
  private client: CurrencyServiceClient

  constructor(transport: RpcTransport) {
    this.client = new CurrencyServiceClient(transport)
  }

  public async getAll(): Promise<Currency[]> {
    const response = await this.client.getAllCurrencies(GetAllCurrenciesRequest.create()).response
    return await Promise.all(response.currencies.map<Promise<Currency>>((dto) => conv.toModel(dto)))
  }

  public async create(data: Omit<Currency, 'id'>): Promise<Currency> {
    let initialExchangeRate: InitialExchangeRate | undefined = undefined
    if (Object.keys(data.exchangeRates).length === 1) {
      const other = Object.keys(data.exchangeRates).map(Number)[0] as keyof typeof data.exchangeRates
      initialExchangeRate = InitialExchangeRate.create({
        other,
        rate: data.exchangeRates[other][0].rate,
        date: formatDateTime(data.exchangeRates[other][0].date),
      })
    }

    const response = await this.client.createCurrency(
      CreateCurrencyRequest.create({
        ...data,
        initialExchangeRate,
      }),
    ).response

    const exchangeRates: { [p: number]: ExchangeRate[] } = {}
    if (typeof response.exchangeRateId !== 'undefined') {
      const other = Object.keys(data.exchangeRates).map(Number)[0] as keyof typeof data.exchangeRates
      exchangeRates[other] = [
        {
          ...data.exchangeRates[other][0],
          id: response.exchangeRateId,
        },
      ]
    }

    return new Currency(response.currencyId, data.name, data.symbol, data.decimalPoints, exchangeRates)
  }

  public async update(id: number, data: Omit<Currency, 'id'>): Promise<void> {
    await this.client.updateCurrency(
      UpdateCurrencyRequest.create({
        currency: conv.toDTO({ id, ...data }),
      }),
    ).response
  }

  public async setDefault(id: number): Promise<void> {
    await this.client.setDefaultCurrency(SetDefaultCurrencyRequest.create({ currencyId: id })).response
  }
}
