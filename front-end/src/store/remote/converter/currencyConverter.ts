import { Converter } from './converter'
import Currency, { CurrencyUpdatableFields, RateAutoupdateSettings } from '../../../domain/model/currency'
import { Currency as CurrencyDto, UpdateCurrencyFields } from '../dto/currency'

export class CurrencyConverter
  implements Converter<Currency, CurrencyDto, CurrencyUpdatableFields, UpdateCurrencyFields>
{
  toModel(dto: CurrencyDto): Currency {
    return new Currency(
      dto.id,
      dto.name,
      dto.symbol,
      dto.decimalPoints,
      new RateAutoupdateSettings(dto.autoUpdateSettingsScript, dto.autoUpdateSettingsEnabled),
    )
  }

  toDTO(model: Currency): CurrencyDto {
    return CurrencyDto.create({
      id: model.id,
      name: model.name,
      symbol: model.symbol,
      decimalPoints: model.decimalPoints,
      autoUpdateSettingsScript: model.rateAutoupdateSettings.script,
      autoUpdateSettingsEnabled: model.rateAutoupdateSettings.enabled,
    })
  }

  toUpdateDTO(model: Partial<CurrencyUpdatableFields>): UpdateCurrencyFields {
    return UpdateCurrencyFields.create({
      name: model.name,
      symbol: model.symbol,
      decimalPoints: model.decimalPoints,
      autoUpdateSettingsScript: model.rateAutoupdateSettings?.script,
      autoUpdateSettingsEnabled: model.rateAutoupdateSettings?.enabled,
    })
  }
}
