import Currency from "../../../domain/model/currency"
import { Currency as CurrencyDto } from "../dto/currency"
import { Converter } from "./converter"

export class CurrencyConverter implements Converter<Currency, CurrencyDto> {

  toModel(model: CurrencyDto): Promise<Currency> {
    return Promise.resolve(new Currency(model.id, model.name, model.symbol))
  }

  toDTO(dto: Currency): CurrencyDto {
    return CurrencyDto.create({
      id: dto.id,
      name: dto.name,
      symbol: dto.symbol,
    })
  }

} 