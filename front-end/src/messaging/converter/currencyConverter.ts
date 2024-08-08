import { Currency } from "../../domain/model/currency";
import { Currency as CurrencyDto } from "../dto/currency";
import { Converter } from "./converter";

export class CurrencyConverter implements Converter<CurrencyDto, Currency> {

    toDTO(model: CurrencyDto): Currency {
            return new Currency(model.id, model.name, model.symbol)
    }

    toModel(dto: Currency): CurrencyDto {
        return CurrencyDto.create({
            id: dto.id,
            name: dto.name,
            symbol: dto.symbol,
        })
    }
    
} 