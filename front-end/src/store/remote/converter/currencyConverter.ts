import { Converter } from './converter'
import { formatDateTime } from './transactionConverter'
import Currency, { ComponentRatio, Composition, CompositionType, ExchangeRate } from '../../../domain/model/currency'
import {
  ComponentRatio as ComponentRatioDto,
  Composition as CompositionDto,
  Currency as CurrencyDto,
  InnerComposition,
  RatesList,
  UpdateCurrencyFields,
} from '../dto/currency'

export class CurrencyConverter implements Converter<Currency, CurrencyDto> {
  toModel(model: CurrencyDto): Promise<Currency> {
    return Promise.resolve(
      new Currency(
        model.id,
        model.name,
        model.symbol,
        model.decimalPoints,
        model.type,
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
        model.compositions.map((dayComposition) => {
          return new Composition(
            new Date(dayComposition.date),
            Object.keys(dayComposition.compositions)
              .map((k) => k as CompositionType)
              .reduce<{
                [key in CompositionType]?: {
                  [name: string]: ComponentRatio
                }
              }>((compositions, key) => {
                compositions[key] = Object.keys(dayComposition.compositions[key].ratios).reduce<{
                  [name: string]: ComponentRatio
                }>((ratios, name) => {
                  ratios[name] = new ComponentRatio(dayComposition.compositions[key].ratios[name].ratio)
                  return ratios
                }, {})
                return compositions
              }, {}),
          )
        }),
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
      type: dto.type,
      compositions: dto.compositions.map((composition) => {
        return CompositionDto.create({
          date: composition.date.toISOString(),
          compositions: Object.keys(composition.compositions)
            .map((t) => t as keyof typeof composition.compositions)
            .reduce<{ [key: string]: InnerComposition }>((prev, key) => {
              prev[key] = InnerComposition.create({
                ratios: Object.keys(composition.compositions[key]!.ratios).reduce<{
                  [name: string]: ComponentRatioDto
                }>((subRatios, name) => {
                  subRatios[name] = ComponentRatioDto.create({
                    ratio: composition.compositions[key]![name].ratio,
                  })
                  return subRatios
                }, {}),
              })
              return prev
            }, {}),
        })
      }),
    })
  }

  toUpdateDTO(dto: Partial<Omit<Currency, 'id'>>): UpdateCurrencyFields {
    return UpdateCurrencyFields.create({
      name: dto.name,
      symbol: dto.symbol,
      decimalPoints: dto.decimalPoints,
    })
  }
}
