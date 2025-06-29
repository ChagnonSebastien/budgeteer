import { Converter } from './converter'
import { formatDateTime } from './transactionConverter'
import ExchangeRate, {
  ExchangeRateIdentifiableFields,
  ExchangeRateUpdatableFields,
} from '../../../domain/model/exchangeRate'
import {
  ExchangeRate as ExchangeRateDto,
  UpdateExchangeRateFields as UpdateExchangeRateFieldsDTO,
} from '../dto/exchangeRate'

export class ExchangeRateConverter
  implements Converter<ExchangeRate, ExchangeRateDto, ExchangeRateUpdatableFields, UpdateExchangeRateFieldsDTO>
{
  toModel(dto: ExchangeRateDto): ExchangeRate {
    return new ExchangeRate(
      new ExchangeRateIdentifiableFields(dto.currencyA, dto.currencyB, new Date(dto.date)),
      dto.rate,
    )
  }

  toDTO(model: ExchangeRate): ExchangeRateDto {
    return ExchangeRateDto.create({
      currencyA: model.currencyA,
      currencyB: model.currencyB,
      date: formatDateTime(model.date),
      rate: model.rate,
    })
  }

  toUpdateDTO(model: Partial<ExchangeRateUpdatableFields>): UpdateExchangeRateFieldsDTO {
    return UpdateExchangeRateFieldsDTO.create({
      rate: model.rate,
    })
  }
}
