import { Converter } from './converter'
import Account, { AccountUpdatableFields, Balance } from '../../../domain/model/account'
import {
  Account as AccountDto,
  CurrencyBalance,
  EditableAccountFields as AccountUpdatableFieldsDTO,
} from '../dto/account'

export class AccountConverter
  implements Converter<Account, AccountDto, AccountUpdatableFields, AccountUpdatableFieldsDTO>
{
  toModel(dto: AccountDto): Account {
    return new Account(
      dto.id,
      dto.name,
      dto.balances.map((value) => new Balance(value.currencyId, value.amount)),
      dto.isMine,
      dto.type,
      dto.financialInstitution,
    )
  }

  toDTO(model: Account): AccountDto {
    return AccountDto.create({
      id: model.id,
      name: model.name,
      balances: model.initialAmounts.map((value) =>
        CurrencyBalance.create({
          currencyId: value.currencyId,
          amount: value.value,
        }),
      ),
      isMine: model.isMine,
      type: model.type,
      financialInstitution: model.financialInstitution,
    })
  }

  toUpdateDTO(model: Partial<AccountUpdatableFields>): AccountUpdatableFieldsDTO {
    return AccountUpdatableFieldsDTO.create({
      name: model.name,
      updateBalances: typeof model.initialAmounts !== 'undefined',
      balances: model.initialAmounts?.map((value) =>
        CurrencyBalance.create({
          currencyId: value.currencyId,
          amount: value.value,
        }),
      ),
      type: model.type,
      financialInstitution: model.financialInstitution,
    })
  }
}
