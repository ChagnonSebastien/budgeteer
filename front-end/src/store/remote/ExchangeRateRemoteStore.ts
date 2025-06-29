import { RpcTransport } from '@protobuf-ts/runtime-rpc'

import { ExchangeRateConverter } from './converter/exchangeRateConverter'
import { formatDateTime } from './converter/transactionConverter'
import {
  CreateExchangeRateRequest,
  GetAllExchangeRateRequest,
  TestGetCurrencyRateRequest,
  UpdateExchangeRateRequest,
} from './dto/exchangeRate'
import { ExchangeRateServiceClient } from './dto/exchangeRate.client'
import ExchangeRate, {
  ExchangeRateIdentifiableFields,
  ExchangeRateUpdatableFields,
} from '../../domain/model/exchangeRate'

const conv = new ExchangeRateConverter()

export default class ExchangeRateRemoteStore {
  private readonly client: ExchangeRateServiceClient

  constructor(transport: RpcTransport) {
    this.client = new ExchangeRateServiceClient(transport)
  }

  public async getAll(): Promise<ExchangeRate[]> {
    const response = await this.client.getAllExchangeRate(GetAllExchangeRateRequest.create()).response
    return response.rates.map<ExchangeRate>((dto) => conv.toModel(dto))
  }

  public async create(
    data: ExchangeRateUpdatableFields,
    identity: ExchangeRateIdentifiableFields,
  ): Promise<ExchangeRate> {
    await this.client.createExchangeRate(
      CreateExchangeRateRequest.create({
        ...data,
        currencyA: identity.currencyA,
        currencyB: identity.currencyB,
        date: formatDateTime(identity.date),
      }),
    )
    return new ExchangeRate(
      new ExchangeRateIdentifiableFields(identity.currencyA, identity.currencyB, identity.date),
      data.rate,
    )
  }

  public async update(
    identity: ExchangeRateIdentifiableFields,
    data: Partial<ExchangeRateUpdatableFields>,
  ): Promise<void> {
    await this.client.updateExchangeRate(
      UpdateExchangeRateRequest.create({
        currencyA: identity.currencyA,
        currencyB: identity.currencyB,
        date: formatDateTime(identity.date),
        fields: conv.toUpdateDTO(data),
      }),
    ).response
  }

  public testGetRateScript(): (script: string) => Promise<string> {
    const client = this.client
    return async (script: string): Promise<string> => {
      const resp = await client.testGetCurrencyRate(TestGetCurrencyRateRequest.create({ script }))
      return resp.response.response
    }
  }
}
