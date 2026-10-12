import { Converter } from './converter'
import Currency, {
  CurrencyUpdatableFields,
  RateAutoupdateSettings,
  RateFetchFailure,
} from '../../../domain/model/currency'
import { Currency as CurrencyDto, UpdateCurrencyFields } from '../dto/currency'

export class CurrencyConverter
  implements Converter<Currency, CurrencyDto, CurrencyUpdatableFields, UpdateCurrencyFields>
{
  toModel(dto: CurrencyDto): Currency {
    return new Currency(
      dto.id,
      dto.name,
      dto.symbol,
      dto.risk,
      dto.type,
      dto.decimalPoints,
      new RateAutoupdateSettings(dto.autoUpdateSettingsScript, dto.autoUpdateSettingsEnabled),
      dto.rateFetchFailedAt === '' ? null : new RateFetchFailure(new Date(dto.rateFetchFailedAt), dto.rateFetchError),
      new Date(dto.createdAt),
    )
  }

  toDTO(model: Currency): CurrencyDto {
    return CurrencyDto.create({
      id: model.id,
      name: model.name,
      symbol: model.symbol,
      risk: model.risk,
      type: model.type,
      decimalPoints: model.decimalPoints,
      autoUpdateSettingsScript: model.rateAutoupdateSettings.script,
      autoUpdateSettingsEnabled: model.rateAutoupdateSettings.enabled,
      rateFetchFailedAt: model.rateFetchFailure?.at.toISOString() ?? '',
      rateFetchError: model.rateFetchFailure?.message ?? '',
      createdAt: model.createdAt.toISOString(),
    })
  }

  toUpdateDTO(model: Partial<CurrencyUpdatableFields>): UpdateCurrencyFields {
    return UpdateCurrencyFields.create({
      name: model.name,
      symbol: model.symbol,
      risk: model.risk,
      type: model.type,
      decimalPoints: model.decimalPoints,
      autoUpdateSettingsScript: model.rateAutoupdateSettings?.script,
      autoUpdateSettingsEnabled: model.rateAutoupdateSettings?.enabled,
    })
  }
}
