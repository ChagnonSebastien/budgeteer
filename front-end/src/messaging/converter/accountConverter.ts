import { Account } from "../../domain/model/account";
import { Account as AccountDto } from "../dto/account";
import { Converter } from "./converter";

export class AccountConverter implements Converter<AccountDto, Account> {

    toDTO(model: AccountDto): Account {
            return new Account(model.id, model.name, model.initialAmount)
    }

    toModel(dto: Account): AccountDto {
        return AccountDto.create({
            id: dto.id,
            name: dto.name,
            initialAmount: dto.initialAmount,
        })
    }
    
} 