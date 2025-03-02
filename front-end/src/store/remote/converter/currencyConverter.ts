import { Converter } from './converter'
import { formatDateTime } from './transactionConverter'
import Currency, { ExchangeRate } from '../../../domain/model/currency'
import { Currency as CurrencyDto, RatesList, UpdateCurrencyFields } from '../dto/currency'

export class CurrencyConverter implements Converter<Currency, CurrencyDto> {
  toModel(model: CurrencyDto): Promise<Currency> {
    return Promise.resolve(
      new Currency(
        model.id,
        model.name,
        model.symbol,
        model.decimalPoints,
        Object.keys(model.exchangeRates)
          .map(Number)
          .map((t) => t as keyof typeof model.exchangeRates)
          .map((key) => {
            return {
              [key]: model.exchangeRates[key].rates.map(
                (exchangeRate) => new ExchangeRate(exchangeRate.id, exchangeRate.rate, new Date(exchangeRate.date)),
              ),
            }
          })
          .reduce<{ [compareTo: number]: ExchangeRate[] }>((acc, cur) => ({ ...acc, ...cur }), {}),
      ),
    )
  }

  toDTO(dto: Currency): CurrencyDto {
    return CurrencyDto.create({
      id: dto.id,
      name: dto.name,
      symbol: dto.symbol,
      decimalPoints: dto.decimalPoints,
      exchangeRates: Object.keys(dto.exchangeRates)
        .map(Number)
        .map((t) => t as keyof typeof dto.exchangeRates)
        .map((key) => {
          return {
            [key]: RatesList.create({
              rates: dto.exchangeRates[key].map((exchangeRate) => ({
                id: exchangeRate.id,
                rate: exchangeRate.rate,
                date: formatDateTime(exchangeRate.date),
              })),
            }),
          }
        })
        .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
    })
  }

  toUpdateDTO(dto: Partial<Omit<Currency, 'id' | 'hasName'>>): UpdateCurrencyFields {
    return UpdateCurrencyFields.create({
      name: dto.name,
      symbol: dto.symbol,
      decimalPoints: dto.decimalPoints,
    })
  }
}
