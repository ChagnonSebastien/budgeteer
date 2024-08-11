import Account from "../../domain/model/account"
import { Account as AccountDto } from "../dto/account"
import { Converter } from "./converter"

export class AccountConverter implements Converter<Account, AccountDto> {

  toModel(dto: AccountDto): Promise<Account> {
    return Promise.resolve(new Account(dto.id, dto.name, dto.initialAmount))
  }

  toDTO(model: Account): AccountDto {
    return AccountDto.create({
      id: model.id,
      name: model.name,
      initialAmount: model.initialAmount,
    })
  }

} 