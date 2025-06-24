import { Converter } from './converter'
import { formatDateTime } from './transactionConverter'
import Currency, { ExchangeRate, RateAutoupdateSettings } from '../../../domain/model/currency'
import {
  Currency as CurrencyDto,
  RateAutoUpdateSettings as RateAutoUpdateSettingsDTO,
  RatesList,
  UpdateCurrencyFields,
} from '../dto/currency'

export class CurrencyConverter implements Converter<Currency, CurrencyDto> {
  toModel(dto: CurrencyDto): Promise<Currency> {
    return Promise.resolve(
      new Currency(
        dto.id,
        dto.name,
        dto.symbol,
        dto.decimalPoints,
        Object.keys(dto.exchangeRates)
          .map(Number)
          .map((t) => t as keyof typeof dto.exchangeRates)
          .map((key) => {
            return {
              [key]: dto.exchangeRates[key].rates.map(
                (exchangeRate) => new ExchangeRate(exchangeRate.id, exchangeRate.rate, new Date(exchangeRate.date)),
              ),
            }
          })
          .reduce<{ [compareTo: number]: ExchangeRate[] }>((acc, cur) => ({ ...acc, ...cur }), {}),
        new RateAutoupdateSettings(
          dto.rateAutoUpdateSettings?.script ?? '',
          dto.rateAutoUpdateSettings?.enabled ?? false,
        ),
      ),
    )
  }

  toDTO(model: Currency): CurrencyDto {
    return CurrencyDto.create({
      id: model.id,
      name: model.name,
      symbol: model.symbol,
      decimalPoints: model.decimalPoints,
      exchangeRates: Object.keys(model.exchangeRates)
        .map(Number)
        .map((t) => t as keyof typeof model.exchangeRates)
        .map((key) => {
          return {
            [key]: RatesList.create({
              rates: model.exchangeRates[key].map((exchangeRate) => ({
                id: exchangeRate.id,
                rate: exchangeRate.rate,
                date: formatDateTime(exchangeRate.date),
              })),
            }),
          }
        })
        .reduce((acc, cur) => ({ ...acc, ...cur }), {}),
      rateAutoUpdateSettings: RateAutoUpdateSettingsDTO.create({
        script: model.rateAutoupdateSettings.script,
        enabled: model.rateAutoupdateSettings.enabled,
      }),
    })
  }

  toUpdateDTO(dto: Partial<Omit<Currency, 'id' | 'hasName'>>): UpdateCurrencyFields {
    return UpdateCurrencyFields.create({
      name: dto.name,
      symbol: dto.symbol,
      decimalPoints: dto.decimalPoints,
      autoUpdateSettings:
        typeof dto.rateAutoupdateSettings !== 'undefined'
          ? RateAutoUpdateSettingsDTO.create({
              script: dto.rateAutoupdateSettings.script,
              enabled: dto.rateAutoupdateSettings.enabled,
            })
          : undefined,
    })
  }
}
