import { Converter } from './converter'
import Account, { Balance } from '../../../domain/model/account'
import { Account as AccountDto, CurrencyBalance } from '../dto/account'

export class AccountConverter implements Converter<Account, AccountDto> {
  toModel(dto: AccountDto): Promise<Account> {
    return Promise.resolve(
      new Account(
        dto.id,
        dto.name,
        dto.balances.map((value) => new Balance(value.currencyId, value.amount)),
        dto.isMine,
        dto.type ?? null,
        dto.financialInstitution ?? null,
      ),
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
      type: model.type ?? undefined,
      financialInstitution: model.financialInstitution ?? undefined,
    })
  }
}
